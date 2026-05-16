# 05 — Benchmarks & Detection Engine

Spec refs: `../idea/03-detection-rules.md` (engine contract, default
RuleConfig, 23 rules, review-priority, category resolution, family→scene
shortlist note), `../idea/06`. Phase 1 (core rules) → Phase 4 (all 23 tuned).
Depends on: 03, 04.

## Epic 5.1 — Benchmark stage
- [ ] `BuildBenchmarks` over full scope → `benchmarks` doc: category price
  stats by UNSPSC **4-digit family** with segment→mainCategory fallback
  (`n<8`), buyer method mix + national baseline, peer medians, supplier/
  buyer rollups, scope label.
  *Done:* `benchmarks._id = scope:<min..max>`; spot-checked vs raw aggregates.
- [ ] Category resolution helper (award→most-frequent item family, tie=first).
  *Done:* unit-tested incl. fallback levels.

## Epic 5.2 — Rule engine
- [ ] `Rule` contract + registry + `RuleContext`; `ContractSignal` w/
  `primaryEntityId = buyer.id`, `timeWindow = scope`, evidence items.
  *Done:* engine runs an empty registry; types match `../idea/03`.
- [ ] **Default `RuleConfig`** with the documented starter values + LCE bands
  (Q90k/Q900k); `confidence = clamp01((metric−threshold)/scale)`.
  *Done:* config object matches the `../idea/03` table; no magic numbers in
  rule bodies.
- [ ] Review-priority derivation (High/Med/Low; no numeric score surfaced).
  *Done:* unit table covers the thresholds in `../idea/03`.
- [ ] Deterministic **family→scene shortlist** export (per `../idea/05`
  Scene contract) from a case's fired rules.
  *Done:* given fired ruleIds, returns the exact allowed sceneIds per
  chapter.

## Epic 5.3 — Core rules (Phase 1)
- [ ] Implement rules **1, 3, 7, 13** + their evidence & severity per
  `../idea/03`.
  *Done:* each fires on a crafted fixture and on real ingested data; evidence
  cites the exact OCDS fields.

## Epic 5.4 — Remaining rules (Phase 4 depth)
- [ ] Implement rules 2,4,5,6,8,9,10,11,12,14,15,16,17,18,19,20,21,22,23.
  *Done:* each unit-tested; rule 6 capped low-confidence per its caveat;
  rule 20 only fires when `tenderPeriod.endDate` present.

## Epic 5.5 — RunDetection orchestration
- [ ] Apply registry over `curatedReleases` + `benchmarks` → write `signals`;
  honor `runDetection` toggle; `pipelineRuns` counts.
  *Done:* full corpus run produces signals; idempotent re-run replaces
  cleanly; spot-check 5 rules vs `../assets/guatecompras_schema_report.md`.
