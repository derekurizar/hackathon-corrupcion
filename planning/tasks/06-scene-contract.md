# 06 — Scene Contract (shared package)

Spec refs: `../idea/05-frontend.md` → "Scene contract" (authoritative),
`../idea/04`, `../idea/06`. Phase 0 (core) → Phase 4 (variants).
Consumed by generation (`07`) and the SPA (`11`).

## Epic 6.1 — Param schemas (Zod) — 7 core scenes
- [ ] Schemas for `CoverHeadline`, `CaseStatement`, `MoneyFlowStreams`,
  `ConcentrationFan`, `EvidenceLedger`, `AwardTimeline`, `ClosingStatement`,
  each param tagged **bound | quantitative(+ref) | presentational** exactly
  per `../idea/05`.
  *Done:* schemas compile; fixtures (valid + invalid) tested.
- [ ] `ScenePlanEntry = {sceneId, params, source:"llm"|"fallback"}` type +
  per-chapter union.
  *Done:* matches `../idea/06` `scenePlan` shape.

## Epic 6.2 — Shortlist map
- [ ] Deterministic `shortlist(chapter, firedRuleIds) → sceneId[]` (default
  first) exactly per the `../idea/05` table.
  *Done:* table-driven unit tests for every chapter/condition incl. defaults.

## Epic 6.3 — Evidence-binding validator
- [ ] `validateScenePlan(chapter, entry, signals, evidence, investigation)`:
  sceneId∈shortlist; bound params overwritten with server values;
  quantitative params must carry a resolving `ref` whose value matches;
  presentational shape/length + emphasis target exists;
  `ClosingStatement.caveat` required & non-empty.
  *Done:* unit tests cover each failure → `source:"fallback"`, success →
  `source:"llm"`.
- [ ] `deriveFromEvidence(chapter, signals, evidence, investigation)` builds
  each chapter's **default** scene params with no LLM input.
  *Done:* every chapter yields a renderable default from fixtures.

## Epic 6.4 — Variant schemas (Phase 4 depth)
- [ ] Schemas + shortlist wiring for `CaseSplit`, `PriceBars`,
  `ThresholdLadder`, `SplittingCluster`, `RepeatBidders`, `EvidenceCompare`,
  `GapSpotlight`; (`RegionMap` stretch).
  *Done:* each variant validated like the core set; shortlist conditions
  match `../idea/05`.

## Epic 6.5 — Package boundary
- [ ] Publish as `@scene-contract` consumed by `@core` generation + the SPA;
  no React in the contract (pure types/validation).
  *Done:* both consumers import it; no UI dep leaks into `@core`.
