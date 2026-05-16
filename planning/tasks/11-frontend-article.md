# 11 — Frontend: Cinematic Article

Spec refs: `../idea/05-frontend.md` (chapter spine, Scene Catalog/contract,
nav modes, motion, a11y/perf). Phase 3 (core) → Phase 4 (depth).
Depends on: 10, 06, 09.

## Epic 11.1 — Article shell & chapter spine
- [ ] `ArticleShell` (spine + mode state) + `ChapterSlot` rendering the fixed
  spine: Cover · El Caso · Sigue el Dinero · Las Conexiones · Evidencia ·
  Cronología · Cierre.
  *Done:* renders all chapters from one investigation payload.
- [ ] `ScenePicker`: render `scenePlan[chapter]`; if `source:"fallback"` or
  unknown, render the chapter default; never crash on missing data.
  *Done:* a malformed `scenePlan` still renders a complete article.

## Epic 11.2 — 7 core scenes (Phase 3)
- [ ] Build `CoverHeadline`, `CaseStatement`, `MoneyFlowStreams`,
  `ConcentrationFan`, `EvidenceLedger`, `AwardTimeline`, `ClosingStatement`
  to the `@scene-contract` param schemas; consume validated params only.
  *Done:* each scene renders from fixtures + real data; `EvidenceLedger`
  shows exact field→value→benchmark; `AwardTimeline` shows honest "SIN DATO
  PÚBLICO" markers; `ClosingStatement` always shows the caveat.
- [ ] Motion choreography per `../idea/05` (parallax cover, count-ups,
  graph build-in, staggered reveals).
  *Done:* 60fps on a mid laptop; transform/opacity only.

## Epic 11.3 — Navigation modes
- [ ] **Scroll** (default): scroll-driven chapter progression; left rail +
  bottom progress.
  *Done:* smooth; active chapter tracked.
- [ ] **Presentation**: full-screen chapters; arrows/Space/scrubber/keys;
  cinematic transitions.
  *Done:* keyboard-complete; no layout breakage.
- [ ] **Podcast**: play ES/EN audio; chapters auto-advance on approximate
  `podcastCuePoints`; manual override; "now narrating" highlight.
  *Done:* audio + chapter follow; explicitly approximate (no word sync);
  language toggle switches text+audio+cues.

## Epic 11.4 — Accessibility & performance
- [ ] `prefers-reduced-motion` variant (cross-fades, no parallax, instant
  counters); keyboard nav; ARIA for transport/rail.
  *Done:* reduced-motion path verified; keyboard-only run works.
- [ ] Code-split scene components; `content-visibility` for offscreen
  chapters; lazy media.
  *Done:* initial bundle lean; scene chunks load on demand.

## Epic 11.5 — Scene variants (Phase 4 depth)
- [ ] `CaseSplit`, `PriceBars`, `ThresholdLadder`, `SplittingCluster`,
  `RepeatBidders`, `EvidenceCompare`, `GapSpotlight` (then `RegionMap`
  stretch), each to its `@scene-contract` schema + shortlist.
  *Done:* picked correctly when their rules fire; fall back cleanly when not.
