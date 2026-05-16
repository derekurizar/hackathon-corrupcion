# 06 — Scene Contract (dev plan)

Spec: [`../06-scene-contract.md`](../06-scene-contract.md) | Idea refs:
`../../idea/05-frontend.md` → "Scene contract" (authoritative),
`../../idea/04-story-and-podcast.md`, `../../idea/06-data-model.md`
Phase: 0 (7 core scenes + validator) + 4 (7 variants) | Depends on: 03 |
Blocks: 07 (generation), 11 (SPA ScenePicker)
Prereqs (`00-sequence.dev.md` §2): Area 01 `backend/` baseline + Area 03
schema types present (`Signal`/`Investigation`/evidence — structural-
compatibility target, type-only).

## Structure & reuse

- Lives in **`backend/src/scene-contract/`** (00 §0). **Pure**: TS types +
  Zod + validation only — **no React, no mongo/db, no AWS**.
- **Self-contained & copy-portable**: defines its **own input view-types**
  (`SceneSignal`, `SceneEvidenceItem`, `SceneInvestigation`) structurally
  compatible with Area 03's `Signal`/`Investigation`/evidence. **Zero
  cross-imports** (not even type imports from `backend/src/schema`) so a
  verbatim folder copy compiles standalone. A backend type-compat test
  asserts Area 03 types are assignable to the view-types.
- `frontend/` (isolated, Area 11) consumes a **hand-synced copy**
  `frontend/src/_scene-contract/` — **no `file:` dep**. Refreshed by the
  `backend` `sync:scene-contract` script (+ `SCENE_CONTRACT_HASH` marker).
  Drift = accepted, documented risk.
- Area 03 left `investigations.scenePlan[].params` permissive
  (`z.record(z.unknown())`). **Area 06 owns** the strict per-scene schemas +
  validator; **Area 07** applies `validateScenePlan` before persisting; Area
  03's persistence schema stays permissive (cross-ref — do not tighten it
  here).
- Function/descriptor style (consistent with the rest of `backend/`); no
  classes.

---

## Epic 6.1 — Param schemas (Zod) — 7 core scenes  (Phase 0)

Goal: a Zod schema + kind-tagged descriptor for each of the 7 core scenes, and
the `ScenePlanEntry`/`ScenePlan` types matching idea/06.

Steps:
1. `backend/src/scene-contract/types.ts`:
   - `Chapter = 'cover'|'elCaso'|'sigueElDinero'|'lasConexiones'|'evidencia'|
     'cronologia'|'cierre'`.
   - `ParamKind = 'bound'|'quant'|'presentational'`.
   - `ScenePlanEntry = { sceneId: string; params: Record<string, unknown>;
     source: 'llm'|'fallback' }`; `ScenePlan = Record<Chapter,
     ScenePlanEntry>`.
   - Input view-types `SceneSignal`, `SceneEvidenceItem` (`{ field: string;
     value: unknown; comparison?: string; benchmark?: unknown }`),
     `SceneInvestigation` — structurally matching Area 03.
2. `backend/src/scene-contract/scenes/<scene>.ts` — one per `CoverHeadline`,
   `CaseStatement`, `MoneyFlowStreams`, `ConcentrationFan`, `EvidenceLedger`,
   `AwardTimeline`, `ClosingStatement`. Each exports a **descriptor**
   `{ sceneId, chapter, schema: ZodType, kinds: Record<paramPath, ParamKind> }`
   per the idea/05 param lists, e.g.:
   - `CoverHeadline` (cover): `kicker|headline|dek|bgVariant`=presentational;
     `heroStat.value`=quant; `heroStat.unit|buyer|supplierDisplay|
     reviewPriority`=bound.
   - `CaseStatement` (elCaso): `lead|pullStat.label|facts[].text`=
     presentational; `pullStat.value|facts[].valueRef?`=quant.
   - `MoneyFlowStreams` (sigueElDinero): `buyer|streams[].supplierId|
     streams[].supplierDisplay`=bound; `totalValue|streams[].amount|
     streams[].share`=quant; `emphasisSupplierId|caption`=presentational.
   - `ConcentrationFan` (lasConexiones): `buyer|suppliers[].supplierId|
     suppliers[].supplierDisplay|suppliers[].flagged`=bound;
     `topShare|suppliers[].value|suppliers[].share`=quant; `caption`=
     presentational.
   - `EvidenceLedger` (evidencia): `items[].{field,value,benchmark,
     comparison}`=bound; `itemCaptions[]|order`=presentational.
   - `AwardTimeline` (cronologia): `events[].date|events[].kind|
     missingStages[]`=bound; `events[].valueRef?`=quant;
     `events[].label|highlightIdx|caption`=presentational.
   - `ClosingStatement` (cierre): `whatItMeans`=presentational; `caveat`=
     presentational **required & non-empty** (z `.min(1)`); `ctas`=bound
     (fixed: methodology, listen, share).
   `scenes/index.ts` = `SCENES: Record<sceneId, descriptor>` +
   `CORE_SCENE_IDS`.
3. Fixtures `backend/src/scene-contract/scenes/__fixtures__/<scene>.ts` (one
   valid + one invalid each); `scenes.test.ts` parses them.
4. `backend/src/scene-contract/scene-plan.compat.test.ts`: type-level assert
   `ScenePlan` is assignable to Area 03 `Investigation['scenePlan']` (import
   the Area 03 type **type-only**, in the test file only — never in the
   shipped module).

Verify:
- spec *Done* "schemas compile; fixtures (valid+invalid) tested" →
  `pnpm --dir backend test` scene schema suite green; `pnpm --dir backend
  typecheck` passes.
- spec *Done* "ScenePlanEntry … matches idea/06 scenePlan shape" → the
  compat test compiles (Area 03 ⊆ scene-contract view).

## Epic 6.2 — Shortlist map  (Phase 0)

Goal: deterministic `shortlist(chapter, firedRuleIds)` returning sceneIds,
default first, exactly per the idea/05 table.

Steps:
1. `backend/src/scene-contract/shortlist.ts`:
   - `ruleFamily(ruleId: number): 'F1'|'F2'|'F3'|'F4'` (1–6=F1, 7–12=F2,
     13–17=F3, 18–23=F4).
   - `shortlist(chapter, firedRuleIds: number[], opts?: { hasBenchmark?:
     boolean; hasRegion?: boolean }): string[]` — **default first**:
     `cover`→[CoverHeadline] (fixed); `cierre`→[ClosingStatement] (fixed);
     `elCaso`→[CaseStatement, CaseSplit] (CaseSplit always);
     `sigueElDinero`→[MoneyFlowStreams, +PriceBars if 13|14, +ThresholdLadder
     if 15|18, +RegionMap if `hasRegion` (stretch)];
     `lasConexiones`→[ConcentrationFan, +SplittingCluster if 18,
     +RepeatBidders if 10]; `evidencia`→[EvidenceLedger, +EvidenceCompare if
     `hasBenchmark`]; `cronologia`→[AwardTimeline, +GapSpotlight if 20|21].
   - `defaultScene(chapter)` = `shortlist(chapter, [])[0]`.

Verify:
- spec *Done* "table-driven unit tests for every chapter/condition incl.
  defaults" → `shortlist.test.ts` asserts every chapter, every trigger rule,
  and the no-rules default-only case; `pnpm --dir backend test` green.

## Epic 6.3 — Evidence-binding validator + `deriveFromEvidence`  (Phase 0)

Goal: validate an LLM scene plan entry against shortlist + evidence; on any
failure fall back to the default scene derived purely from data.

Steps:
1. `backend/src/scene-contract/refs.ts`: `parseRef(s)` /
   `resolveRef(ref, signals, evidence)` for grammar `ev:<index>` (index into
   the **flattened, deterministically-ordered** case-evidence array) and
   `sig:<rule_id>[.<jsonPath>]`. Document the flattened-evidence ordering
   contract (must match Area 07 emission / Area 03 evidence order).
2. `backend/src/scene-contract/derive.ts`:
   `deriveFromEvidence(chapter, signals, evidence, investigation)` → params
   for that chapter's `defaultScene`, built purely from data (no LLM); covers
   all 7 chapters.
3. `backend/src/scene-contract/validator.ts`:
   `validateScenePlan(chapter, entry, signals, evidence, investigation):
   ScenePlanEntry` enforcing idea/05's 6 rules — (1) `entry.sceneId ∈
   shortlist(chapter, firedRuleIds…)`; (2) **bound** params overwritten with
   authoritative server values (LLM ignored); (3) **quant** params must carry
   a `ref` that resolves and value-matches (exact: ids/enums/dates;
   numeric-equal: amounts/shares); (4) **presentational**: shape/length only;
   any emphasis/`*Id` target must exist in-scene; (5)
   `ClosingStatement.caveat` present & non-empty; (6) any failure →
   `{ sceneId: defaultScene(chapter), params: deriveFromEvidence(...),
   source: 'fallback' }`; full success → `{ …, source: 'llm' }`.
4. `validator.test.ts` + `derive.test.ts` over fixtures.

Verify:
- spec *Done* "unit tests cover each failure → source:'fallback', success →
  source:'llm'" → `validator.test.ts` has one case per rule (1–5) forcing
  fallback + one full-success `llm` case; green.
- spec *Done* "every chapter yields a renderable default from fixtures" →
  `derive.test.ts` asserts each chapter's derived default itself passes
  `validateScenePlan` with `source:'fallback'`.

## Epic 6.4 — Variant schemas  (Phase 4)

Goal: the 7 variant scenes (+ `RegionMap` stretch) as descriptors, wired into
the shortlist.

Steps:
1. Add `scenes/<variant>.ts` descriptors (same `{sceneId,chapter,schema,
   kinds}` pattern) for `CaseSplit`(elCaso), `PriceBars`(sigueElDinero),
   `ThresholdLadder`(sigueElDinero), `SplittingCluster`(lasConexiones),
   `RepeatBidders`(lasConexiones), `EvidenceCompare`(evidencia),
   `GapSpotlight`(cronologia); `RegionMap`(sigueElDinero, **stretch**).
   Param schemas per idea/05's kind-tagged pattern (finalized here — idea/05
   defers them to this build task).
2. They are already reachable via Epic 6.2 triggers — add fixtures + extend
   `scenes.test.ts`/`shortlist.test.ts`.

Verify:
- spec *Done* "each variant validated like the core set; shortlist conditions
  match idea/05" → variant schema + shortlist tests green. **Phase 4 — tagged;
  not gated into Phase 0.**

## Epic 6.5 — Package boundary + frontend sync  (Phase 0)

Goal: a clean pure public surface, an in-package consumer path for Area 07,
and a documented frontend copy/sync.

Steps:
1. `backend/src/scene-contract/index.ts` — sole public surface: `SCENES`,
   `shortlist`/`defaultScene`, `validateScenePlan`, `deriveFromEvidence`,
   all types. Re-export it from `backend/src/index.ts` (for Area 07).
2. Purity: no `react`, no `mongodb`, no `backend/src/db`, no `@aws-sdk`, no
   value import from `backend/src/schema` anywhere under
   `backend/src/scene-contract/` (the shipped module).
3. `backend` script `"sync:scene-contract"` → wipe+copy
   `backend/src/scene-contract/` → `frontend/src/_scene-contract/`, then write
   `frontend/src/_scene-contract/SCENE_CONTRACT_HASH` = sha256 of the copied
   tree. Document in `backend/README.md` + the runbook below. (Target
   materializes when `frontend/` exists — Areas 10/11; Area 06 ships the
   script + doc only.)

Verify:
- spec *Done* "both consumers import it; no UI dep leaks into @core" →
  `grep -rEn "react|mongodb|@aws-sdk|/db/|src/schema" backend/src/scene-
  contract` → **no matches**; backend can `import { validateScenePlan } from
  'backend'`; copy `backend/src/scene-contract` to a temp dir and
  `tsc --noEmit` it standalone → passes (copy-portable).

---

## Files created (at execution)

`backend/src/scene-contract/`: `index.ts`, `types.ts`, `shortlist.ts`,
`refs.ts`, `derive.ts`, `validator.ts`, `scenes/index.ts`,
`scenes/{coverHeadline,caseStatement,moneyFlowStreams,concentrationFan,
evidenceLedger,awardTimeline,closingStatement}.ts` (+ Phase 4:
`{caseSplit,priceBars,thresholdLadder,splittingCluster,repeatBidders,
evidenceCompare,gapSpotlight,regionMap}.ts`), `scenes/__fixtures__/*`,
`scenes.test.ts`, `shortlist.test.ts`, `validator.test.ts`, `derive.test.ts`,
`scene-plan.compat.test.ts`. Edits: `backend/src/index.ts` (re-export),
`backend/package.json` (`sync:scene-contract` script), `backend/README.md`
(sync doc).

## Decisions locked

- `backend/src/scene-contract/`; pure zod-only; no React/mongo/db/AWS; no
  Area-03 value imports.
- Self-contained & copy-portable; own input view-types; Area-03 type-compat
  asserted in a test only.
- `frontend/` = hand-synced copy via `sync:scene-contract` +
  `SCENE_CONTRACT_HASH`; no `file:` dep; drift accepted/documented.
- Scene = `{sceneId,chapter,schema,kinds}`; chapters
  `cover|elCaso|sigueElDinero|lasConexiones|evidencia|cronologia|cierre`.
- Ref grammar `ev:<index>` | `sig:<rule_id>[.<path>]`; exact vs numeric-equal
  match per param kind. Family map 1–6=F1/7–12=F2/13–17=F3/18–23=F4;
  shortlist default-first.
- Phases: 6.1/6.2/6.3/6.5 = Phase 0; 6.4 = Phase 4 (authored, tagged).
- Area 07 applies the validator pre-persist; Area 03 persistence stays
  permissive (cross-ref).

## Risks

- **Drift** (frontend copy vs canonical) — user-accepted; mitigated by
  `sync:scene-contract` + `SCENE_CONTRACT_HASH` (detectable) + documented
  re-sync step; Area 11 must re-sync before building.
- **Copy-portability** — any accidental cross-import breaks the standalone
  copy; guarded by the purity grep + standalone `tsc --noEmit` of a temp copy.
- **Evidence has no id** — ref binding is index/`rule_id`; the flattened
  case-evidence order must be deterministic and shared with Area 07/03 —
  documented in `refs.ts`.
- **Variant schemas finalized here** — Phase 4 scope, tagged so not gated
  into Phase 0.

## Verification (end-to-end runbook)

```
# Phase 0 (offline; no Atlas needed — pure module)
pnpm --dir backend install && pnpm --dir backend build        # 0 exit
pnpm --dir backend typecheck                                  # types OK
pnpm --dir backend test                                       # scenes +
                                                              # shortlist +
                                                              # validator +
                                                              # derive + compat
grep -rEn "react|mongodb|@aws-sdk|/db/|src/schema" \
     backend/src/scene-contract                               # no matches
tmp=$(mktemp -d) && cp -r backend/src/scene-contract "$tmp"/sc \
  && (cd "$tmp"/sc && npx tsc --noEmit *.ts scenes/*.ts)      # copy-portable
# frontend sync (once frontend/ exists — Areas 10/11)
pnpm --dir backend run sync:scene-contract                    # copy + HASH
```
All Phase-0 checks green ⇒ Area 06 satisfies its spec *Done:* criteria and
contributes the "scene-contract validator unit-tested with fixtures" part of
the Phase 0 exit gate (`00-sequence.dev.md` §4).
