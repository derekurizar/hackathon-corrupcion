# 05 — Benchmarks & Detection (dev plan)

Spec: [`../05-benchmarks-detection.md`](../05-benchmarks-detection.md) | Idea
refs: `../../idea/03-detection-rules.md` (authoritative engine contract +
default RuleConfig + 23 rules + review-priority), `../../idea/06-data-model.md`
Phase: 1 (engine + benchmarks + **all 23 rules**, untuned) → 4 (tuning only) |
Depends on: 03, 04 | Blocks: 07, 09
Prereqs (`00-sequence.dev.md` §2): Phase 0 exit green; Area 04 has ingested
≥1 month into `curatedReleases`; `MONGODB_URI` in `.env`.

## Deviation & reuse

- **Deviation from `../05-benchmarks-detection.md`:** the spec tags Epic 5.3 =
  4 core rules (1,3,7,13) Phase 1 and Epic 5.4 = the other 19 rules **"Phase 4
  depth"**. Per the project-owner decision, **all 23 rules are implemented in
  Phase 1** (default `RuleConfig`, untuned); **Area 05's Phase-4 work is
  reduced to threshold tuning on the full ~12-month corpus** (the
  `00-sequence.md` Phase-4 "all 23 rules tuned" gate). The spec file is
  source-of-truth and is **not edited**; this deviation is recorded here and
  noted in `00-sequence.dev.md` §4.
- Lives **entirely in `backend/`**: `backend/src/stages/benchmarks.ts` +
  `backend/src/stages/detect.ts` replace the Area 01 throwing stubs (same
  exported `benchmarks`/`detect`); the engine lives in
  `backend/src/detection/`. The `data-integestion` `benchmarks`/`detect` CLI
  subcommands (Area 01) are thin wrappers; `RUN_BENCHMARKS`/`RUN_DETECTION`
  honored via `loadConfig()`.
- **Reuse, never duplicate:** Area 03 `caseKey` (`backend/src/identity`),
  `recomputeRollup` (`…/entities.ts`), pipeline-runs writer
  (`startRun`/`markStage`/`setCounts`/`appendError`/`finishRun`),
  `benchmarksSchema`/`signalsSchema`/`CuratedRelease`. **Additive** to Area 03
  repos: `iterateCuratedReleases({scope})`, `upsertBenchmark`/`getBenchmark`,
  `deleteSignalsByScope(scope)` (Area 03 didn't define these; no Area 03
  rework). `backend` detection **imports `shortlist`/`ruleFamily` from
  `backend/src/scene-contract`** (Area 06 — backend imports the module
  directly; only the *frontend copy* is self-contained). Area 03's
  `signals[].evidence` stays permissive — Area 05 fills rule-specific evidence
  content and persists via that schema.

---

## Epic 5.1 — Benchmark stage  (Phase 1)

Goal: a `benchmarks` doc over the full scope + a category-resolution helper.

Steps:
1. `backend/src/detection/category.ts`: `awardCategory(release)` = most-
   frequent 4-digit UNSPSC family in `tender.itemFamilies` (tie = first);
   `resolveCategoryLevel(family, counts)` falling back family → 2-digit
   segment → `mainProcurementCategory` when `n < config.CATEGORY_MIN_SAMPLE`.
2. Additive Area 03 repo fns: `iterateCuratedReleases({scope})` (async cursor)
   in `…/curated-releases.ts`; `upsertBenchmark(doc)` / `getBenchmark(scopeId)`
   in `…/benchmarks.ts`.
3. `backend/src/stages/benchmarks.ts` (replace stub) `buildBenchmarks({scope})`
   — one pass over `iterateCuratedReleases` computing: `categoryPrice`
   (median/p25/p75/count + level per family), `peerCategoryMedian`,
   `buyerMethodMix`, `nationalMethodBaseline`, `periodScope{min,max}`; `_id =
   "scope:<min>..<max>"`; validate with Area 03 `benchmarksSchema`;
   `recomputeRollup` (Area 03) for every entity seen (idea/02: rollups
   recomputed here); `pipelineRuns` stage status via the Area 03 writer.

Verify:
- spec *Done* "`benchmarks._id = scope:<min..max>`; spot-checked vs raw
  aggregates" → `pnpm --dir data-integestion cli benchmarks` writes the doc;
  an env-gated test recomputes one family median from raw and asserts equality.
- spec *Done* "category resolution unit-tested incl. fallback levels" →
  `backend/src/detection/category.test.ts` covers family/segment/mainCategory
  fallback + tie-break.

## Epic 5.2 — Rule engine  (Phase 1)

Goal: the pluggable engine, default `RuleConfig`, review-priority, and the
fired-rules → scene shortlist export.

Steps:
1. `backend/src/detection/types.ts` — `Rule`, `RuleContext`,
   `ContractSignal` exactly per idea/03 (`primaryEntityId = buyer.id`,
   `timeWindow = scope`, `evidence[]{field,value,comparison?,benchmark?}`).
2. `backend/src/detection/config.ts` — `defaultRuleConfig`: idea/03 table
   verbatim + `LCE_COMPRA_DIRECTA_MAX=90_000`, `LCE_COTIZACION_MAX=900_000`,
   `CATEGORY_MIN_SAMPLE=8`, per-rule `scale`. **No magic numbers in rule
   bodies** (rules read `ctx.config.*`).
3. `backend/src/detection/confidence.ts` — `confidence(metric,threshold,
   scale)= clamp01((metric−threshold)/scale)`.
4. `backend/src/detection/review-priority.ts` —
   `reviewPriority(caseSignals): 'high'|'medium'|'low'` per idea/03
   (high if any high OR ≥3 medium; medium if any medium OR ≥2 low; else low).
   No numeric score surfaced. (Consumed by Area 07 for
   `investigations.reviewPriority`.)
5. `backend/src/detection/registry.ts` — `RULES` registry (canonical
   `rule_id`→`family`; pluggable: add a rule = add a module + register) +
   `firedRulesShortlist(chapter, firedRuleIds, opts)` that **imports
   `shortlist`/`ruleFamily` from `backend/src/scene-contract`** (Area 06).
   `registry.consistency.test.ts` asserts every `RULES` family equals
   scene-contract `ruleFamily(id)` (no silent divergence).

Verify:
- spec *Done* "engine runs an empty registry; types match idea/03" → unit
  test runs the engine with `[]` rules → `[]` signals; type-check passes.
- spec *Done* "config matches the idea/03 table; no magic numbers in rule
  bodies" → a `config` snapshot test + `grep -Rn "[0-9]" backend/src/
  detection/rules` review shows only `ctx.config.*` thresholds.
- spec *Done* "review-priority unit table covers idea/03 thresholds" →
  `review-priority.test.ts` table.
- spec *Done* "given fired ruleIds, returns the exact allowed sceneIds per
  chapter" → test calls `firedRulesShortlist` and asserts per-chapter sets.

## Epic 5.3 — Core rules (1, 3, 7, 13)  (Phase 1)

Goal: the 4 hero rules firing deterministically with exact evidence.

Steps:
1. `backend/src/detection/rules/single_bidder.ts` (F1),
   `direct_award_overreliance.ts` (F1),
   `supplier_concentration_per_buyer.ts` (F2, HERO),
   `price_outlier_vs_category.ts` (F3) — thresholds from `defaultRuleConfig`;
   severity tiers + `confidence`; `evidence[]` cites exact OCDS fields;
   `primaryEntityId = buyer.id`; `caseKey` via Area 03 identity. Register in
   `RULES`.

Verify:
- spec *Done* "each fires on a crafted fixture and on real ingested data;
  evidence cites the exact OCDS fields" → per-rule fixture tests +
  env-gated run over real ingested data asserts each fires and
  `evidence[].field` matches the documented OCDS path.

## Epic 5.4 — Remaining 19 rules  (Phase 1 — elevated from spec Phase 4)

Goal: every other rule implemented (untuned).

Steps:
1. `backend/src/detection/rules/*.ts` for rules
   2,4,5,6,8,9,10,11,12,14,15,16,17,18,19,20,21,22,23 per idea/03; rule 6
   capped low-confidence per its caveat; rule 20 fires only when
   `tenderPeriod.endDate` present. All thresholds from `defaultRuleConfig`.
   Register each in `RULES`.

Verify:
- spec *Done* "each unit-tested; rule 6 low-confidence; rule 20
  endDate-gated" → per-rule fixture tests green; **untuned** defaults are
  acceptable (tuning is Area 05 Phase 4).

## Epic 5.5 — RunDetection orchestration  (Phase 1)

Goal: apply the registry over the corpus, write idempotent signals.

Steps:
1. Additive Area 03 signals-repo fn `deleteSignalsByScope(scope)`.
2. `backend/src/stages/detect.ts` (replace stub) `runDetection({scope})`:
   load `benchmarks`; build an entity index; `iterateCuratedReleases({scope})`
   → per release build `RuleContext` → run `RULES`; deterministic
   `signal_id = sha256(rule_id|ocid|scope[|idx])`; **idempotent re-run** =
   `deleteSignalsByScope(scope)` then bulk insert; honor `RUN_DETECTION`;
   counts via the Area 03 pipeline-runs writer.

Verify:
- spec *Done* "full corpus run produces signals; idempotent re-run replaces
  cleanly; spot-check 5 rules vs the schema report" →
  `pnpm --dir data-integestion cli detect` writes signals; a second run
  yields identical counts (delete-by-scope + reinsert); manual spot-check of
  5 rules vs `../../assets/guatecompras_schema_report.md`.

---

## Files created (at execution)

`backend/src/detection/`: `types.ts`, `config.ts`, `confidence.ts`,
`review-priority.ts`, `registry.ts`, `category.ts`, `rules/*.ts` (23) + tests
(`category.test.ts`, `review-priority.test.ts`, `registry.consistency.test.ts`,
per-rule fixture tests). `backend/src/stages/benchmarks.ts` +
`backend/src/stages/detect.ts` (replace stubs). Additive Area 03 repo fns in
`backend/src/repositories/{curated-releases,benchmarks,signals}.ts`. Edits:
`backend/src/index.ts` (export real `benchmarks`/`detect`),
`data-integestion/src/cli.ts` (`--scope`/`--year/--month` args + `--help`).

## Decisions locked

- All in `backend/`; stages replace Area 01 stubs (same exports); engine in
  `backend/src/detection/`; CLI thin wrappers honor `RUN_BENCHMARKS`/
  `RUN_DETECTION`.
- **All 23 rules in Phase 1** (default `RuleConfig`, untuned); Area 05 Phase 4
  = **tuning only**. Spec Epic 5.4 elevated P4→P1 — deviation recorded; spec
  file untouched.
- Reuse Area 03 `caseKey`/`recomputeRollup`/pipeline-runs/schemas; **add**
  `iterateCuratedReleases`, `upsertBenchmark`/`getBenchmark`,
  `deleteSignalsByScope` (additive to Area 03 repos).
- `backend` detection imports `shortlist`/`ruleFamily` from
  `backend/src/scene-contract`; `RULES` is the canonical rule→family source;
  a consistency test guards against divergence.
- Single `defaultRuleConfig` (idea/03 + LCE Q90k/Q900k + `CATEGORY_MIN_SAMPLE`
  + per-rule `scale`); no magic numbers in rule bodies; `confidence =
  clamp01((metric−threshold)/scale)`; `primaryEntityId = buyer.id`.
- Idempotency: deterministic `signal_id = sha256(rule_id|ocid|scope[|idx])`;
  RunDetection = `deleteSignalsByScope(scope)` then bulk insert.
- `reviewPriority(caseSignals)` in detection (idea/03 thresholds; no numeric
  score); Area 07 consumes it.

## Risks

- **Spec deviation (Epic 5.4 P4→P1)**: heavier Phase 1; recorded here + 00 §4;
  spec text untouched.
- **`ruleFamily` duplication**: scene-contract is intentionally self-contained
  (copy-portable); detection `RULES` is canonical — consistency unit test
  prevents silent divergence.
- **Area 03 gaps**: corpus cursor / benchmark-by-scope / signals
  delete-by-scope are added here as additive repo fns (no Area 03 rework).
- **Untuned defaults**: Phase-1 signals may be noisy — acceptable; tuning is
  Area 05 Phase 4; the P1 gate is "spot-check vs idea/03".
- **Atlas/data-dependent Verifies** need Area 04 ≥1 month + `MONGODB_URI`
  (§2); offline coverage = rule/category/config/review-priority unit tests on
  fixtures.

## Verification (end-to-end runbook)

```
# offline (fixtures only)
pnpm --dir backend install && pnpm --dir backend build        # 0 exit
pnpm --dir backend test                                       # 23 rules +
                                                              # category +
                                                              # config + review-
                                                              # priority +
                                                              # family-consistency
# with Atlas + ≥1 ingested month (Phase 1)
pnpm --dir data-integestion cli benchmarks                    # writes benchmarks
pnpm --dir data-integestion cli detect                        # writes signals
pnpm --dir data-integestion cli detect                        # re-run: same counts
RUN_INTEGRATION=1 pnpm --dir backend test                     # benchmark spot-
                                                              # check + core-rule
                                                              # real-data fires
```
All green ⇒ Area 05 satisfies its spec *Done:* criteria and delivers the
"benchmarks computed" + "signals written for the full rule set" parts of the
Phase 1 exit gate (`00-sequence.dev.md` §4). Phase-4 work for Area 05 =
threshold tuning on the full corpus only.
