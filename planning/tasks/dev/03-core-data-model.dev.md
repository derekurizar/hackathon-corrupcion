# 03 — Core & Data Model (dev plan)

Spec: [`../03-core-data-model.md`](../03-core-data-model.md) | Idea refs:
`../../idea/06-data-model.md` (authoritative collections/indexes),
`../../idea/02-data-ingestion.md`, `../../idea/03-detection-rules.md`
Phase: 0 | Depends on: 01 | Blocks: 04, 05, 06, 07, 09 (everyone reading/
writing Atlas)
Prereqs (`00-sequence.dev.md` §2): `MONGODB_URI` in `.env` + Atlas reachable
(integration suite & `ensure-indexes` need it — it is a §2 "Have"); Area 01
`backend/` foundation present (`src/db/client.ts`, `src/config/env.ts`,
`src/schema/curated-release.ts`, `src/ocds/`, `src/index.ts`) + the
`data-integestion` CLI.

## Structure & reuse

- Area 03 is **entirely in `backend/`** (canonical, no workspace). It
  **extends — never rebuilds —** Area 01's `getMongoClient`/`getDb`/
  `closeMongo` (`src/db/client.ts`), `loadConfig` (`src/config/env.ts`), and
  `CuratedReleaseSchema` (`src/schema/curated-release.ts`).
- Function-style modules everywhere (consistent with `loadConfig()` /
  `getMongoClient()`): no classes.
- `idea/06` defers deep sub-shapes — `signals[].evidence` rule-specifics →
  Area 05; `investigations.scenePlan[].params` → Area 06 scene-contract; story
  prose → Area 07. Area 03 validates these **permissively-structured**
  (`z.unknown()` / `z.record`) and cross-refs the owning area; do not invent
  stricter shapes here.
- Adds **one additive** `data-integestion` CLI subcommand (`ensure-indexes`)
  over a new `backend` stage — does not change existing CLI subcommands.

---

## Epic 3.1 — Mongo access layer

Goal: a typed access layer over the (already memoized) client for the 8
collections.

Steps:
1. **Reuse** `backend/src/db/client.ts` (Area 01) as-is — 3.1a "memoized
   client" is already satisfied by Area 01 (`getMongoClient`/`getDb`/
   `closeMongo` + its memoization unit test + `cli ping`). Do not rebuild.
2. `backend/src/db/collections.ts`: export `COLLECTIONS` (the 8 names:
   `curatedReleases,entities,benchmarks,signals,investigations,editions,
   dashboardStats,pipelineRuns`) and a typed
   `getCollection<N extends CollectionName>(name: N): Collection<DocFor<N>>`
   over `getDb()`, where `DocFor<N>` maps each name → the inferred schema type
   from `backend/src/schema/*` (Epic 3.2). Re-export from `backend/src/
   index.ts`.
3. `backend/src/db/collections.int.test.ts` (Vitest, **skip unless**
   `process.env.MONGODB_URI` or `RUN_INTEGRATION=1`): connect to real Atlas,
   assert every accessor returns a usable typed `Collection`, and that two
   `getMongoClient()` calls return the same instance (integration form of
   3.1a Done).

Verify:
- spec *Done* "repeated calls reuse one connection; integration test green vs
  the real Atlas" → with `MONGODB_URI` set, `pnpm --dir backend test` runs the
  gated integration test green; memoization asserted.
- spec *Done* "each accessor returns the typed shape from `../idea/06`" →
  `getCollection('signals')` etc. infer the schema type;
  `pnpm --dir backend typecheck` passes.

## Epic 3.2 — Schemas & indexes (idempotent setup)

Goal: Zod schemas + TS types for all 8 collections and an idempotent
`ensureIndexes()` creating exactly `idea/06`'s indexes, runnable via the CLI.

Steps:
1. `backend/src/schema/`: reuse `curated-release.ts`; add `entities.ts`,
   `benchmarks.ts`, `signals.ts`, `investigations.ts`, `editions.ts`,
   `dashboard-stats.ts`, `pipeline-runs.ts` per `idea/06` field specs — money
   `z.number()`, ISO dates `z.string()`, integers `z.number().int()`, enums
   `z.enum` (`kind` supplier|buyer; `entityType` company|individual|unknown;
   `family` F1..F4; `severity` low|medium|high; `reviewPriority`
   high|medium|low; scene `source` llm|fallback). Deferred parts:
   `signals[].evidence` = `{ field: string, value: z.unknown(), comparison?:
   string, benchmark?: z.unknown() }`; `investigations.scenePlan[ch]` =
   `{ sceneId: string, params: z.record(z.unknown()), source: z.enum(['llm',
   'fallback']) }`; `investigations.es/en` story objects per `idea/06`'s
   documented chapter fields (cover{kicker,headline,dek}, body chapters,
   cierre/closing{...,caveat}, keyFindings[]). `schema/index.ts` re-exports
   all schemas + inferred types (`Entity`,`Benchmark`,`Signal`,
   `Investigation`,`Edition`,`DashboardStats`,`PipelineRun`); surface via
   `backend/src/index.ts`.
2. `backend/src/db/ensure-indexes.ts`: `ensureIndexes()` driven by a table
   mirroring `idea/06` **verbatim**:
   - `curatedReleases`: `{ocid:1}` **unique**, `{ "buyer.id":1 }`,
     `{ "awards.supplierIds":1 }`, `{ "tender.itemFamilies":1 }`,
     `{ year:1, month:1 }`, `{ "tender.procurementMethodDetails":1 }`
   - `entities`: `{ kind:1 }`, `{ entityType:1 }`, `{ "rollup.awardValue":-1 }`
   - `signals`: `{ caseKey:1 }`, `{ rule_id:1 }`, `{ family:1 }`, `{ ocid:1 }`
   - `investigations`: `{ reviewPriority:1, updatedAt:-1 }`,
     `{ "buyer.id":1 }`, `{ signalFamily:1 }`, `{ ruleIds:1 }`, and a **single**
     `$text` index over es+en headline/summary fields
   - `editions`: `{ publishedAt:-1 }`
   - `benchmarks`,`dashboardStats`,`pipelineRuns`: no indexes — ensure the
     collection exists via `createCollection` (swallow NamespaceExists).
   `createIndex` is idempotent; guard `createCollection` so re-runs don't
   error.
3. `backend/src/stages/ensure-indexes.ts` (new stage) wrapping
   `ensureIndexes()`, exported from `backend/src/index.ts`; add an
   `ensure-indexes` subcommand to `data-integestion/src/cli.ts` (thin wrapper,
   same shape as the other subcommands) and add it to the `--help` list.
4. `backend/src/schema/*.fixtures.ts` (one minimal valid doc per collection) +
   `backend/src/schema/schema.test.ts` — valid fixture parses; one malformed
   variant fails, per collection.

Verify:
- spec *Done* "schemas compile; fixtures validate" → `pnpm --dir backend test`
  schema suite green; `pnpm --dir backend typecheck` passes.
- spec *Done* "run twice → no error, indexes present (verify via
  `getIndexes`)" → `pnpm --dir data-integestion cli ensure-indexes` exits 0
  **twice**; gated integration test calls `db.collection(x).indexes()` and
  asserts each collection's `idea/06` set (incl. `{ocid}` unique,
  `tender.itemFamilies`, investigations `$text`).

## Epic 3.3 — Repositories

Goal: per-collection repos with the guarded keep-latest upsert, entity
upsert+rollup, and the CRUD/queries the API (Area 09) needs.

Steps:
1. `backend/src/repositories/curated-releases.ts`: `upsertCuratedRelease(doc)`
   — guarded keep-latest by `ocid`: write **iff** incoming `date` (fallback
   `tender.datePublished`) ≥ stored `date`. Extract a pure predicate
   `shouldReplace(incoming, stored): boolean` so it is unit-testable without a
   DB; apply via conditional upsert. Plus `getByOcid(ocid)`.
2. `backend/src/repositories/entities.ts`: `upsertEntity` by canonical `_id`
   (merge fields; never clobber `rollup`); `recomputeRollup(entityId)`
   (awardCount/awardValue/buyerIds/categoryFamilies/first|lastAwardDate/
   historyAvgValue).
3. `backend/src/repositories/{signals,investigations,editions,benchmarks,
   dashboard-stats,pipeline-runs}.ts`: CRUD + Area-09 queries —
   `investigations`: list by `reviewPriority` + filters, `getByCaseKey`,
   `$text` search, distinct filter values; `editions`: `getCurrent` (latest
   `publishedAt`); `dashboardStats`: `getCurrent`/`upsertCurrent` (`_id:
   "current"`); `signals`: by `caseKey`/`ocid`; `benchmarks`: by scope `_id`.
   `repositories/index.ts` re-exports; surface via `backend/src/index.ts`.
4. Tests: pure unit test for `shouldReplace` (older does NOT overwrite newer;
   newer does) — no DB; env-gated integration for entity upsert/merge +
   each repo's key query.

Verify:
- spec *Done* "older doc does NOT overwrite newer; newer does" →
  `shouldReplace` unit test green offline; integration confirms.
- spec *Done* "upsert merges; rollup fields updatable" + "each repo's queries
  covered by a unit/integration test" → repo suite green.

## Epic 3.4 — Identity helpers + `pipelineRuns` writer

Goal: deterministic identity/hash helpers and a `pipelineRuns` lifecycle
writer.

Steps:
1. `backend/src/identity/index.ts` (use `node:crypto`):
   - `canonicalEntityId(scheme, id)` → `` `${scheme}:${id}` `` (idea/02).
   - `caseKey(buyerId, family, scope)` → `sha256(`${buyerId}|${family}|
     ${scope}`)` hex (idea/04 & idea/06 l.104).
   - `evidenceHash(signals)` → **locked normalization**: sort signals by
     `(rule_id, ocid)`; project deterministic fields incl. each
     `evidence[].field/value/comparison/benchmark`; stable-stringify with
     sorted keys; `sha256` hex (idea/04 l.151–153). Document the exact
     normalization in a doc-comment (Area 07 dedup must match it).
   - `deriveEntityType(party)` per idea/02: `legalEntityTypeDetail.
     description` → else name/keyword heuristic
     (`LASTNAME,LASTNAME,,FIRSTNAME,` ⇒ individual;
     `S.A.|SOCIEDAD ANÓNIMA|COOPERATIVA` ⇒ company) → else `unknown`;
     doc-comment: "`unknown` is treated as individual (privacy-safe)
     downstream".
   Surface via `backend/src/index.ts`.
2. `backend/src/repositories/pipeline-runs.ts` writer: `startRun({months,
   toggles})` → doc `_id:"run-<ISO>"`, `startedAt`, all `stages:"pending"`;
   `markStage(runId,stage,status)`; `setCounts(runId,counts)`;
   `appendError(runId,err)`; `finishRun(runId)`.
3. Tests: `backend/src/identity/identity.test.ts` with **fixed vectors**
   (hard-coded expected sha256 hex; `caseKey`/`canonicalEntityId`;
   `evidenceHash` stable when input signal order is shuffled); `pipeline-runs`
   integration test (a run doc reflects stage status & counts).

Verify:
- spec *Done* "deterministic; documented; unit-tested against fixed vectors" →
  `identity.test.ts` green with hard-coded hashes; helpers carry doc-comments.
- spec *Done* "a run doc reflects stage status & counts" → `pipeline-runs`
  integration test green.

---

## Files created (at execution)

`backend/src/schema/`: `entities.ts`, `benchmarks.ts`, `signals.ts`,
`investigations.ts`, `editions.ts`, `dashboard-stats.ts`, `pipeline-runs.ts`,
`index.ts`, `*.fixtures.ts`, `schema.test.ts`.
`backend/src/db/`: `collections.ts`, `collections.int.test.ts`,
`ensure-indexes.ts`.
`backend/src/repositories/`: `curated-releases.ts`, `entities.ts`,
`signals.ts`, `investigations.ts`, `editions.ts`, `benchmarks.ts`,
`dashboard-stats.ts`, `pipeline-runs.ts`, `index.ts`, repo tests.
`backend/src/identity/`: `index.ts`, `identity.test.ts`.
`backend/src/stages/ensure-indexes.ts`; `backend/src/index.ts` (extend
re-exports). `data-integestion/src/cli.ts` (add `ensure-indexes` + `--help`).

## Decisions locked

- All in `backend/`; reuse Area 01 `db/client.ts`, `config/env.ts`,
  `schema/curated-release.ts` (no rebuild). 3.1a = already done by Area 01.
- Function-style modules; index table mirrors `idea/06` verbatim; single
  `$text` index on `investigations` (Mongo allows one `$text`/collection).
- `ensure-indexes` = new additive `data-integestion` CLI subcommand + backing
  `backend` stage; Phase-0 gate command =
  `pnpm --dir data-integestion cli ensure-indexes`.
- Deferred shapes (signals evidence rule-specifics, investigations scenePlan
  params, story prose) validated permissively-structured; deep validation
  owned by Areas 05/06/07 (cross-ref).
- Integration tests env-gated on `MONGODB_URI`/`RUN_INTEGRATION`; `shouldReplace`
  predicate + identity helpers have pure unit tests (fixed vectors, no DB).
  `node:crypto` sha256 hex; stable-stringify (sorted keys) for `evidenceHash`.

## Risks

- Atlas required for integration & `ensure-indexes` Verifies (`MONGODB_URI`
  is a §2 "Have"); offline coverage = pure unit tests (predicate +
  fixed-vector hashes).
- `evidenceHash` determinism hinges on the locked normalization — must match
  Area 07 dedup; documented in code; fixed-vector test guards regressions.
- New CLI subcommand crosses into `data-integestion/` (Area 01's folder) —
  kept additive (one subcommand + `--help` entry) over a `backend` stage;
  `00 §4` Phase-0 gate updated to reference it.
- Permissive `z.unknown()`/`z.record` for scenePlan params & signal evidence
  is intentional — Areas 05/06/07 tighten them (cross-referenced).

## Verification (end-to-end runbook)

```
# offline (no Atlas)
pnpm --dir backend install && pnpm --dir backend build       # 0 exit
pnpm --dir backend typecheck                                 # accessors typed
pnpm --dir backend test                                      # schema + predicate
                                                             # + identity vectors
# with Atlas (MONGODB_URI set / RUN_INTEGRATION=1)
pnpm --dir data-integestion install
pnpm --dir data-integestion cli ensure-indexes               # exit 0
pnpm --dir data-integestion cli ensure-indexes               # exit 0 (idempotent)
RUN_INTEGRATION=1 pnpm --dir backend test                    # collections/index/
                                                             # repo/pipelineRuns int
```
All green ⇒ Area 03 satisfies its spec *Done:* criteria and contributes the
"8 collections + indexes" + "backend connects to Atlas" parts of the Phase 0
exit gate (`00-sequence.dev.md` §4).
