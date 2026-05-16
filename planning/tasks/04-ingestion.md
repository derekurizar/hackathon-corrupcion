# 04 — Ingestion

Spec refs: `../idea/02-data-ingestion.md`, `../idea/06`. Phase 1.
Depends on: 01, 03.

## Epic 4.0 — ZIP-structure spike (do first)
- [ ] Download one month from
  `https://ocds.guatecompras.gt/file/json/{year}/{month}` (un-padded month)
  and inspect the archive: zip vs gzip, entry name(s), single vs multi,
  JSON root shape.
  *Done:* a short note in this file records the exact format; the streaming
  approach below is confirmed or adjusted.

## Epic 4.1 — Fetch & stream
- [ ] Download to Lambda `/tmp` (or local tmp via CLI); open with `yauzl`;
  stream the JSON entry into `stream-json` over `records[]`.
  *Done:* a 100 MB+ month parses with bounded memory locally via the CLI.
- [ ] Fail-safe: retry/backoff on network/unzip/stream errors.
  *Done:* a forced mid-stream error retries then surfaces cleanly.

## Epic 4.2 — Curate & normalize
- [ ] Map `compiledRelease` → `CuratedRelease` keeping only the fields in
  `../idea/02`; **drop** `tender.documents[]` (keep summary) and
  `items.attributes[]`; derive `tender.itemFamilies` (4-digit UNSPSC).
  *Done:* curated doc matches `../idea/06` shape; payload size sane.
- [ ] Compact `bids: [{status,amount,tendererId}]` + `bidCounts`.
  *Done:* rules-5/10/17 inputs reconstructable from a fixture.
- [ ] Money as `Number` (float64); derive `year`/`month`; capture buyer
  `region`.
  *Done:* values exact to cents on round-trip.

## Epic 4.3 — Entity resolution
- [ ] Canonical id (`scheme:id`); `entityType` hint (legalEntityTypeDetail →
  else name/keyword heuristic → else `unknown`); store raw names verbatim.
  *Done:* unit tests: company vs individual vs unknown cases; "unknown"
  treated as individual downstream documented.

## Epic 4.4 — Idempotent persistence
- [ ] `IngestMonth` orchestration: stream → curate → guarded keep-latest
  upsert `curatedReleases` + `entities` upsert; write `pipelineRuns`.
  *Done:* re-ingesting any month, any order, yields no dups and keeps the
  latest state (integration test on 2 overlapping months).
- [ ] `INGEST_ONLY` short-circuit support (stage toggle honored).
  *Done:* with `INGEST_ONLY` the run stops after ingest.

## Epic 4.5 — Handler wrapper
- [ ] Thin Lambda handler over `@core.ingestMonth({year,month})`.
  *Done:* same code path runs via CLI and Lambda; smoke test both.
