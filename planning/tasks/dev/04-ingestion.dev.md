# 04 — Ingestion (dev plan)

Spec: [`../04-ingestion.md`](../04-ingestion.md) | Idea refs:
`../../idea/02-data-ingestion.md` (authoritative), `../../idea/06-data-model.md`
Phase: 1 | Depends on: 01, 03 | Blocks: 05 (reads `curatedReleases`), 07, 09
Prereqs (`00-sequence.dev.md` §2): Phase 0 exit green (backend builds; 8
collections+indexes via `cli ensure-indexes`; Atlas reachable); Guatecompras
URL verified; `MONGODB_URI` in `.env`.

## Structure & reuse

- The real ingest stage lives in **`backend/src/stages/ingest-month.ts`**,
  replacing the Area 01 throwing stub and keeping the **canonical** exported
  name **`ingestMonth`** (idea/07 task names; kebab file / camelCase export —
  matches Area 01 stub + Area 02 SFN mapping). The `data-integestion`
  `ingest` CLI **verb** (Area 01) and a thin Lambda handler (Area 02 pattern)
  just route to it.
- **Reuse, never duplicate:** Area 01 `loadConfig()` / `getMongoClient` /
  `CuratedReleaseSchema`; Area 03 `upsertCuratedRelease`/`shouldReplace`/
  `getByOcid`, `upsertEntity`/`recomputeRollup`, `canonicalEntityId`/
  `deriveEntityType`, pipeline-runs writer (`startRun`/`markStage`/
  `setCounts`/`appendError`/`finishRun`).
- `backend` stays AWS-SDK-free (handler uses **type-only** `aws-lambda`).
- Specs are source-of-truth and **never edited**: the Epic 4.0 spike finding
  is recorded in this dev plan + `data-integestion/notes/zip-spike.md`.
- Phase 1 scope = **≥1 month** via a single `--year --month`; multi-month /
  full-year backfill is Phase 4 (00-sequence) / Area 08 `Map`.

---

## Epic 4.0 — ZIP-structure spike (do first)  (Phase 1)

Goal: confirm the real archive + JSON shape before locking the streaming code.

Steps:
1. Add a `--spike` path to the `data-integestion` `ingest` subcommand (or
   `data-integestion/scripts/spike-zip.ts`): download the **un-padded** URL
   `https://ocds.guatecompras.gt/file/json/<Y>/<M>` to a tmp path; report
   HTTP `content-type`, magic bytes (zip vs gzip), `yauzl` entry name(s) &
   count, the JSON root keys, and the records array path.
2. Write findings to `data-integestion/notes/zip-spike.md` **and** a "Spike
   findings" block at the bottom of this dev plan. Confirm or adjust Epic 4.1.
   Do **not** edit `../04-ingestion.md`.

Verify (spec *Done*): "a short note records the exact format; the streaming
approach is confirmed or adjusted" → `data-integestion/notes/zip-spike.md`
exists with the entry name + `records[]` root shape; Epic 4.1 reflects it.

## Epic 4.1 — Fetch & stream  (Phase 1)

Goal: download a month to tmp and stream-parse `records[]` with bounded memory.

Steps:
1. `backend/src/ingest/fetch.ts` — `downloadMonth(year, month, destDir):
   Promise<string>`: Node 20 global `fetch` of the un-padded URL → pipe the
   response body to `${destDir}/gc-<Y>-<M>.zip` (Lambda `/tmp`; **no S3
   cache**). `destDir` defaults to `os.tmpdir()`.
2. `backend/src/ingest/stream.ts` — `streamRecords(zipPath): AsyncIterable
   <CompiledReleaseRecord>`: `yauzl.open` (random-access) → open the JSON
   entry (name from the spike) → `stream-json` `parser()` →
   `Pick({ filter: 'records' })` → `streamArray()`; yield one record at a
   time (never `JSON.parse` the whole file).
3. `backend/src/ingest/retry.ts` — `withRetry(fn, { retries, baseMs })`
   (tiny, no dep): exponential backoff for network/unzip/stream errors;
   rethrow with context after exhaustion.

Verify (spec *Done*): "a 100 MB+ month parses with bounded memory locally via
the CLI" → `pnpm --dir data-integestion cli ingest --year <Y> --month <M>
--dry-run` streams a real month, logs the record count, RSS stays bounded;
"a forced mid-stream error retries then surfaces cleanly" →
`backend/src/ingest/retry.test.ts` injects a mid-stream error → retried then
thrown with context.

## Epic 4.2 — Curate & normalize  (Phase 1)

Goal: map `compiledRelease` → a `CuratedReleaseSchema`-valid doc, dropping
heavy blobs.

Steps:
1. `backend/src/ingest/normalize.ts` — `toCuratedRelease(record, { year,
   month })` using `backend/src/ocds` input types:
   - Keep only the idea/02 fields; **drop** `tender.documents[]` →
     `documentsSummary { count, types[], firstDatePublished? }`; **drop**
     `tender.items[].attributes[]` entirely.
   - Derive `tender.itemFamilies` = unique 4-digit prefixes of
     `items[].classification.id` (UNSPSC, 8-digit, 100% present).
   - `awards[].suppliers[].id` → `awards[].supplierIds[]`.
   - Compact bids from `compiledRelease.bids.details[]` →
     `[{ status, amount, tendererId }]`; derive `bidCounts { count, valid,
     disqualified }` by status.
   - Sparsity defaults (documented): absent `bids/awards/contracts` → `[]`;
     `mainProcurementCategory` absent (~0.24%) → `"unknown"`;
     `tenderPeriod.endDate` absent (~75%) → `null` (schema nullable).
   - `region` from the buyer party's `address.region`; `year`/`month` from
     params; money kept as `Number` (float64).
   - `CuratedReleaseSchema.parse(out)` (Area 03) — throw with `ocid` context
     on non-conformance.

Verify (spec *Done*): "curated doc matches idea/06 shape; payload size sane" →
`backend/src/ingest/normalize.test.ts` on a real `compiledRelease` fixture →
`CuratedReleaseSchema.parse` passes, no `documents`/`attributes` keys, size ≪
raw; "rules-5/10/17 inputs reconstructable from a fixture" → asserts
`bids`/`bidCounts`/disqualified counts reconstruct; "values exact to cents on
round-trip" → amount round-trip test.

## Epic 4.3 — Entity resolution  (Phase 1)

Goal: build buyer/supplier entities with canonical id + `entityType`, raw
names verbatim.

Steps:
1. `backend/src/ingest/entities.ts` — `extractEntities(record): EntityDoc[]`
   from `compiledRelease.parties[]`: `_id =
   canonicalEntityId(identifier.scheme, identifier.id)` (Area 03); `kind`
   from `roles[]` (`buyer`|`supplier`; a party may be both → emit both
   kinds/flags); `entityType = deriveEntityType(party)` (Area 03 — legal-
   entity-type-detail → name/keyword heuristic → `unknown`); `name` and
   `legalEntityTypeDetail` stored **raw/verbatim** (no masking — anonymization
   is Area 07).

Verify (spec *Done*): "unit tests: company vs individual vs unknown cases;
'unknown' treated as individual downstream documented" →
`backend/src/ingest/entities.test.ts` covers the 3 cases via
`deriveEntityType`; a doc-comment states `unknown` → individual
(privacy-safe) downstream.

## Epic 4.4 — Idempotent persistence (`IngestMonth`)  (Phase 1)

Goal: orchestrate stream → curate → guarded upserts → `pipelineRuns`;
idempotent re-ingest; `INGEST_ONLY`.

Steps:
1. `backend/src/stages/ingest-month.ts` — replace the Area 01 throwing stub with
   `ingestMonth({ year, month })`: `startRun({ months:[{year,month}],
   toggles })` → `for await (record of streamRecords(downloadMonth(...)))`:
   `toCuratedRelease` → `upsertCuratedRelease` (Area 03 guarded keep-latest by
   `ocid` via `shouldReplace`); `extractEntities` → `upsertEntity` (Area 03;
   merge, never clobber `rollup`); accumulate counts; `markStage`/`setCounts`/
   `appendError` per progress; `finishRun`. Export `ingestMonth` from
   `backend/src/index.ts` (replace the stub; same symbol the CLI/handler
   import).
2. `INGEST_ONLY` (via `loadConfig()`): the stage is ingest-only by definition;
   document that `INGEST_ONLY` means the pipeline/CLI stops after this stage
   (no benchmarks/detection invoked).

Verify (spec *Done*): "re-ingesting any month, any order, yields no dups and
keeps the latest state (integration test on 2 overlapping months)" →
env-gated `backend` integration: ingest month A, then re-ingest an older
snapshot of overlapping `ocid`s → counts stable, `getByOcid` shows the latest
(guarded upsert won); "with `INGEST_ONLY` the run stops after ingest" →
`INGEST_ONLY=true pnpm --dir data-integestion cli ingest --year <Y> --month
<M>` exits after ingest with no downstream stage invoked.

## Epic 4.5 — Handler wrapper  (Phase 1)

Goal: identical `ingestMonth` code path via CLI and Lambda.

Steps:
1. `backend/src/handlers/ingest-month.ts` (Area 02 pattern): thin Lambda handler,
   **type-only** `import type { Handler } from 'aws-lambda'`, parses the
   `{ year, month }` event → `ingestMonth(...)` → result; no AWS SDK.
2. Confirm the Area 01 `data-integestion` `ingest` subcommand routes to
   `ingestMonth` with `--year/--month` (+ `--dry-run`, `--spike`); update the
   `--help` text if needed (additive).

Verify (spec *Done*): "same code path runs via CLI and Lambda; smoke test
both" → `pnpm --dir data-integestion cli ingest --year <Y> --month <M>`
ingests a real month into Atlas; `backend/src/handlers/ingest-month.test.ts`
(mocked stream) invokes `handler({year,month})` and reaches `ingestMonth` →
ok; `grep -rE "@aws-sdk|'aws-sdk'" backend/src` → no matches (type-only
`aws-lambda` allowed).

---

## Files created (at execution)

`backend/src/ingest/`: `fetch.ts`, `stream.ts`, `retry.ts` (+ test),
`normalize.ts` (+ test + `__fixtures__/compiled-release.ts`), `entities.ts`
(+ test). `backend/src/stages/ingest-month.ts` (replaces stub).
`backend/src/handlers/ingest-month.ts` (+ test). Edits: `backend/src/index.ts`
(export real `ingestMonth`), `backend/package.json` (`yauzl`, `stream-json`
deps), `data-integestion/src/cli.ts` (`--spike`/`--dry-run` flags + `--help`),
`data-integestion/notes/zip-spike.md`.

## Decisions locked

- Stage logic `backend/src/stages/ingest-month.ts` (replaces Area 01 stub, same
  exported `ingestMonth`); CLI/handler thin; handler type-only `aws-lambda`.
- Reuse Area 03 repos/identity + Area 01 config/client/schema — no
  re-implementation of guarded upsert / `entityType` / canonical id /
  pipeline-runs.
- Streaming: Node 20 `fetch` → `/tmp` zip → `yauzl` → `stream-json`
  `Pick(records)`+`streamArray`; tiny no-dep retry; no S3 cache; month NOT
  zero-padded.
- Normalizer guarantees `CuratedReleaseSchema` validity: absent
  `bids/awards/contracts` → `[]`; `mainProcurementCategory` → `"unknown"`;
  `tenderPeriod.endDate` → `null`; drop `tender.documents[]` (→summary) +
  `items.attributes[]`; bids from `bids.details[]`; suppliers from
  `awards[].suppliers[].id`.
- 4.0 spike recorded in this dev plan + `data-integestion/notes/zip-spike.md`;
  spec never edited.
- Phase 1 = ≥1 month via single `--year --month`; backfill = Phase 4 / Area 08.

## Risks

- **Spike unknowns**: ZIP-internal entry name / zip-vs-gzip not in the schema
  report — Epic 4.0 gates 4.1; finalize streaming only after the note.
- **Sparsity vs Area 03 "all required"**: mitigated by documented normalizer
  defaulting (empty arrays are truthful, not invented). If a genuinely-absent
  *required scalar* beyond `mainProcurementCategory` appears, escalate as an
  Area 03 schema follow-up — do not silently invent data.
- **Lambda 15 min/10 GB**: one month/invocation, bounded-memory streaming
  (no `JSON.parse`), `/tmp` download; many-month backfill is Phase 4.
- **Network/Atlas Verifies** (real fetch + integration) need the §2 prereqs;
  offline coverage = normalize/entities/retry unit tests on fixtures.

## Verification (end-to-end runbook)

```
# offline (fixtures only)
pnpm --dir backend install && pnpm --dir backend build        # 0 exit
pnpm --dir backend test                                       # normalize +
                                                              # entities + retry
grep -rE "@aws-sdk|'aws-sdk'" backend/src                     # no matches
# network + Atlas (Phase 1; MONGODB_URI set)
pnpm --dir data-integestion cli ingest --year <Y> --month <M> --spike
cat data-integestion/notes/zip-spike.md                       # format recorded
pnpm --dir data-integestion cli ingest --year <Y> --month <M> --dry-run
pnpm --dir data-integestion cli ingest --year <Y> --month <M> # writes Atlas
pnpm --dir data-integestion cli ingest --year <Y> --month <M> # re-run: no dups
RUN_INTEGRATION=1 pnpm --dir backend test                     # 2-overlapping-
                                                              # month idempotency
INGEST_ONLY=true pnpm --dir data-integestion cli ingest --year <Y> --month <M>
```
All green ⇒ Area 04 satisfies its spec *Done:* criteria and delivers the
"≥1 month ingested … keep-latest idempotent upsert … entity resolution +
entityType" part of the Phase 1 exit gate (`00-sequence.dev.md` §4).

## Spike findings (Epic 4.0 — filled at execution)

> _To be completed by Epic 4.0: archive type (zip/gzip), `yauzl` entry
> name(s), JSON root keys, records array path. Mirrors
> `data-integestion/notes/zip-spike.md`._
