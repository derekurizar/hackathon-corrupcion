# 03 — Core & Data Model

Spec refs: `../idea/06-data-model.md` (authoritative collections/indexes),
`../idea/02`, `../idea/03`. Phase 0.

## Epic 3.1 — Mongo access layer
- [ ] Memoized Mongo client in `@core` (reuse across warm Lambdas / CLI).
  *Done:* repeated calls reuse one connection; integration test green vs the
  real Atlas.
- [ ] Typed collection accessors for the 8 collections.
  *Done:* each accessor returns the typed shape from `../idea/06`.

## Epic 3.2 — Schemas & indexes (idempotent setup)
- [ ] Zod schemas + TS types: `curatedReleases`, `entities`, `benchmarks`,
  `signals`, `investigations`, `editions`, `dashboardStats`, `pipelineRuns`.
  *Done:* schemas compile; fixtures validate.
- [ ] `ensureIndexes()` creating exactly the indexes in `../idea/06`
  (incl. `{ocid}` unique, `tender.itemFamilies`, `$text` on
  investigations).
  *Done:* run twice → no error, indexes present (verify via `getIndexes`).

## Epic 3.3 — Repositories
- [ ] `curatedReleases` repo with **guarded keep-latest upsert** by `ocid`
  (write only if incoming `compiledRelease.date`/`publishedDate` ≥ stored).
  *Done:* unit test: older doc does NOT overwrite newer; newer does.
- [ ] `entities` repo: upsert by canonical id; rollup recompute hook.
  *Done:* upsert merges; rollup fields updatable.
- [ ] `signals` / `investigations` / `editions` / `benchmarks` /
  `dashboardStats` / `pipelineRuns` repos (CRUD + the queries the API needs).
  *Done:* each repo's queries covered by a unit/integration test.

## Epic 3.4 — Identity helpers
- [ ] `canonicalEntityId(scheme,id)`, `caseKey(buyerId,family,scope)` =
  `sha256`, `evidenceHash(signals)`.
  *Done:* deterministic; documented; unit-tested against fixed vectors.
- [ ] `pipelineRuns` writer (start/stages/counts/errors).
  *Done:* a run doc reflects stage status & counts.
