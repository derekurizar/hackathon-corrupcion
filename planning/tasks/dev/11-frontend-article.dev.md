# 11 — Frontend: Cinematic Article (dev plan)

Spec: [`../11-frontend-article.md`](../11-frontend-article.md) | Idea refs:
`../../idea/05-frontend.md` (chapter spine, Scene Catalog/contract, nav modes,
motion, a11y/perf)
Phase: 3 (shell + 7 core scenes + Scroll + basic audio) → 4 (Presentation /
Podcast-mode auto-advance, a11y/perf hardening, variants) | Depends on: 10,
06, 09 | Blocks: —
Prereqs (`00-sequence.dev.md` §2): Phase 2 exit green; Area 10 foundation in
`frontend/` (`AppShell`/`BrandRail`/`TransportBar`/`ModeContext`, noir tokens
+ `GrainOverlay`/duotone, i18n, `useInvestigation` + `InvestigationFull`);
`frontend/src/_scene-contract/` synced
(`pnpm --dir backend run sync:scene-contract`).

## Phase split & reuse

- **Resolved spec↔seq conflict (project-owner decision):** the spec groups
  Epic 11.3 (3 modes) and 11.4 (a11y/perf) untagged; `00-sequence.md` makes
  Phase-3 = "7 core scenes in **Scroll** mode, bilingual, with podcast" and
  defers presentation/podcast-mode refinements + the a11y/perf budget to
  **Phase-4 depth**. Adopt the **00-sequence split** (below). The spec file
  is **not edited**; this resolution is recorded here; `00-sequence` already
  says this (only a §4 note + §6 tracker change).
- **Reuse, never re-implement:** Area 10 shell/`ModeContext`/tokens/
  `GrainOverlay`/duotone/i18n/`useInvestigation`/`InvestigationFull` (zod;
  `scenePlan[ch].params` permissive); the synced
  `frontend/src/_scene-contract/` (`SCENES{sceneId,chapter,schema,kinds}`,
  `shortlist`/`defaultScene`, `deriveFromEvidence`, `refs`,
  `Chapter`/`ScenePlanEntry` types). API `/investigations/{caseKey}`
  (`InvestigationFull`) provides chapter content es/en, `scenePlan`,
  `evidence`, audio URLs, `podcastCuePoints`, graph data — **no raw
  `signals`** (API strips internal).
- **ScenePicker design (locked):** Area 07 already ran the full
  evidence-binding `validateScenePlan` server-side and persisted
  `scenePlan.source`. The client has no `signals`, so ScenePicker does **not**
  re-run the full validator. It (1) resolves the component via
  `sceneRegistry[scenePlan[ch].sceneId]`; (2) parses `scenePlan[ch].params`
  with synced `SCENES[sceneId].schema`; (3) on unknown sceneId / parse fail →
  renders the chapter **default** (`defaultScene(chapter)`) with
  `deriveFromEvidence(chapter, /*signals*/ [], evidence, investigation)`
  (evidence-only client fallback). Never crashes.
- Connections graph = **React Flow** (API graph data); motion = Framer
  Motion (transform/opacity only); Recharts **not** used in the Article core.
- Area 11 edits **only `frontend/`**.

---

## Epic 11.1 — Article shell & chapter spine  (Phase 3)

Goal: the fixed 7-chapter Article renders from one investigation payload,
never crashing on a bad `scenePlan`.

Steps:
1. `frontend/src/article/ArticleShell.tsx` — fixed spine `cover · elCaso ·
   sigueElDinero · lasConexiones · evidencia · cronologia · cierre`; mode
   state via Area-10 `ModeContext` (**only Scroll wired in P3**;
   Presentation/Podcast branches stubbed + flagged P4).
2. `frontend/src/article/ChapterSlot.tsx` — wraps a chapter, hands its
   `scenePlan` entry + bound data to `ScenePicker`.
3. `frontend/src/article/sceneRegistry.ts` — `sceneId → React.lazy(component)`
   map (core scenes now; variants added in 11.5).
4. `frontend/src/article/ScenePicker.tsx` — the locked design above
   (registry lookup → synced schema parse → fallback to `defaultScene` +
   `deriveFromEvidence`).
5. `frontend/src/article/sceneRegistry.test.ts` — every core `SCENES`
   chapter-default sceneId has a registered component.

Verify (spec *Done*): renders all 7 chapters from one `useInvestigation`
payload; a deliberately malformed `scenePlan` (bad sceneId / wrong params /
`source:"fallback"`) still renders a complete article (defaults where needed),
no crash.

## Epic 11.2 — 7 core scenes  (Phase 3)

Goal: the 7 core scene components, schema-driven + motion per idea/05.

Steps:
1. `frontend/src/article/scenes/{CoverHeadline,CaseStatement,
   MoneyFlowStreams,ConcentrationFan,EvidenceLedger,AwardTimeline,
   ClosingStatement}.tsx` — props = the **parsed** params from
   `SCENES[sceneId].schema`; render per idea/05:
   - `CoverHeadline`: parallax duotone hero + headline mask-reveal + value
     count-up + priority chip + grain drift.
   - `CaseStatement`: oversized pull-stat + lead + 3 facts; chapter-enter
     rise/fade + stagger + one red-glow pulse on the key datum.
   - `MoneyFlowStreams`: buyer→supplier value streams animate along paths +
     counters roll.
   - `ConcentrationFan`: buyer-hub graph via **React Flow** (API graph data);
     suppliers sized by value; flagged node pulses.
   - `EvidenceLedger`: traceable claim→`field`→`value`→`benchmark` cards
     (exact, from `investigation.evidence`).
   - `AwardTimeline`: timeline draws L→R; dimmed **"SIN DATO PÚBLICO"**
     markers for missing stages.
   - `ClosingStatement`: what it does/doesn't mean + **mandatory caveat**
     (always rendered) + CTAs (methodology/listen/share).
   Text es/en from the investigation doc via i18n language state.
2. `frontend/src/article/scenes/__fixtures__/*` + per-scene tests.

Verify (spec *Done*): each scene renders from fixtures + real data;
`EvidenceLedger` shows exact field→value→benchmark; `AwardTimeline` shows
"SIN DATO PÚBLICO"; `ClosingStatement` always shows the caveat; 60fps on a
mid laptop, transform/opacity only (Scroll path).

## Epic 11.3 — Navigation modes

### Scroll  (Phase 3)
Steps: scroll-driven chapter progression (Framer Motion scroll progress);
`BrandRail` tracks the active chapter; `TransportBar` progress meter; **basic
ES/EN audio playback** — HTML5 `<audio>` from the API audio URL
(CloudFront `/audio/*`); play/pause on `TransportBar`; the i18n language
toggle swaps **text + audio track**; caveat present in audio.
Verify (spec *Done* "Scroll … smooth; active chapter tracked" + Phase-3
"bilingual + 60s podcast"): scroll tracks the active chapter; audio plays
both languages; toggle swaps text+audio.

### Presentation + Podcast-mode auto-advance  (Phase 4)
Steps: full-screen Presentation (◀▶/Space/Home/End/scrubber; mask-wipe /
fade-through-black); Podcast cue-point auto-advance (`podcastCuePoints`,
approximate — tight/word sync an explicit non-goal) + "now narrating"
highlight; manual override.
Verify (spec *Done*): keyboard-complete Presentation, no layout breakage;
audio + chapter follow cue points; language toggle switches text+audio+cues.
**Phase 4 — tagged, not built in P3.**

## Epic 11.4 — Accessibility & performance

### Baseline  (Phase 3 — inherent)
Focus rings + ARIA on the Article shell/transport/rail; WCAG-AA contrast
(Area-10 tokens); transform/opacity-only motion at 60fps on the Scroll path
(covered by Epic 11.2 *Done*).
Verify: keyboard reaches shell controls; an AA-contrast test passes.

### Hardening  (Phase 4)
`prefers-reduced-motion` variants everywhere (cross-fades, no parallax,
instant counters); full keyboard nav for Presentation; **code-split scene
components** + `content-visibility` for offscreen chapters + lazy media
(bundle budget).
Verify (spec *Done*): reduced-motion path verified; keyboard-only run works;
lean initial bundle, scene chunks load on demand. **Phase 4 — tagged.**

## Epic 11.5 — Scene variants  (Phase 4 depth)

Steps: `frontend/src/article/scenes/{CaseSplit,PriceBars,ThresholdLadder,
SplittingCluster,RepeatBidders,EvidenceCompare,GapSpotlight}.tsx` (+
`RegionMap` stretch) to their synced `@scene-contract` schemas; register in
`sceneRegistry`. Selection is server-side already (Area 07 + synced
`shortlist`); ScenePicker just renders the chosen sceneId.
Verify (spec *Done*): picked correctly when their rules fired; fall back
cleanly when not. **Phase 4 — tagged, not built in P3.**

---

## Files created (at execution)

`frontend/src/article/`: `ArticleShell.tsx`, `ChapterSlot.tsx`,
`ScenePicker.tsx`, `sceneRegistry.ts` (+ test),
`scenes/{CoverHeadline,CaseStatement,MoneyFlowStreams,ConcentrationFan,
EvidenceLedger,AwardTimeline,ClosingStatement}.tsx` (P3) + `scenes/
{CaseSplit,PriceBars,ThresholdLadder,SplittingCluster,RepeatBidders,
EvidenceCompare,GapSpotlight,RegionMap}.tsx` (P4), `scenes/__fixtures__/*`,
scene tests; `frontend/src/article/audio.ts` (Scroll basic playback).
Edit: `frontend/src/App.tsx` (`/investigation/:caseKey` → `ArticleShell`,
replacing the Area-10 placeholder). **No edits outside `frontend/`.**

## Decisions locked

- **Phase split:** P3 = shell + `ScenePicker` + 7 core scenes + Scroll +
  basic ES/EN audio + baseline a11y/perf; P4 = Presentation, Podcast-mode
  auto-advance, a11y/perf hardening epic, variants + `RegionMap`. Spec
  untouched; resolution recorded here.
- ScenePicker = registry lookup + synced-`SCENES` schema parse + graceful
  fallback to `defaultScene` via `deriveFromEvidence` (**evidence-only**
  client fallback — API exposes no `signals`; Area 07 validated server-side).
  Consistency test: core sceneIds ↔ registered components.
- Reuse Area 10 shell/`ModeContext`/tokens/`GrainOverlay`/i18n/
  `useInvestigation`/`InvestigationFull`; reuse synced
  `frontend/src/_scene-contract/`.
- Connections graph = React Flow (API graph data); motion = Framer Motion
  (transform/opacity only); Recharts not used here.
- `ClosingStatement` always renders the mandatory caveat; `AwardTimeline`
  honest "SIN DATO PÚBLICO"; `EvidenceLedger` exact field→value→benchmark.
- Area 11 edits **only `frontend/`**; depends on the one-time
  `sync:scene-contract`.

## Risks

- **Spec↔seq phase ambiguity** — resolved to the 00-sequence split; recorded
  here; 00-sequence wording already consistent (only §4 note + §6 tracker).
- **Client lacks `signals`** — no client full re-validation; Area 07 already
  validated + persisted `scenePlan.source`; ScenePicker fallback uses
  evidence only (documented; "never crash" test).
- **Scene-contract drift** — `frontend/src/_scene-contract/` is a synced copy
  (Area 06 `SCENE_CONTRACT_HASH`); re-sync before build if backend changed.
- **Perf bar in P3** — Epic 11.2 *Done* requires 60fps on the Scroll path;
  the broader budget (code-split / `content-visibility`) is the P4 hardening
  epic — tagged so P3 isn't over-scoped.
- **Data-dependent Verifies** need Phase-2 data + a served API; offline
  coverage = scene fixtures + ScenePicker fallback unit tests + `vite
  preview`.

## Verification (end-to-end runbook)

```
# offline
pnpm --dir backend run sync:scene-contract                    # ensure synced
pnpm --dir frontend install
pnpm --dir frontend typecheck && pnpm --dir frontend lint      # clean
pnpm --dir frontend test                                       # sceneRegistry
                                                               # consistency +
                                                               # per-scene
                                                               # fixtures +
                                                               # ScenePicker
                                                               # malformed→default
pnpm --dir frontend build && pnpm --dir frontend preview       # local SPA
# with served API + Phase-2 data
#  open /investigation/<caseKey>: all 7 chapters render (Scroll),
#  BrandRail tracks active chapter, ES/EN toggle swaps text+audio,
#  audio plays via /audio/*, ClosingStatement caveat shown,
#  AwardTimeline shows SIN DATO PÚBLICO where stages missing
```
All P3 checks green ⇒ Area 11 delivers the "cinematic Article — 7 core scenes
in Scroll mode, bilingual + 60s podcast" part of the Phase 3 exit gate
(`00-sequence.dev.md` §4). Presentation/Podcast-mode auto-advance, a11y/perf
hardening, and the 7 variants + `RegionMap` are Area 11 **Phase 4**.
