# 05 — Frontend (Cinematic Investigative UI)

The UI is a **core differentiator**, not chrome. Reference: `../assets/ui_idea.png`.
Direction: **investigative-noir** — a cinematic, documentary "exposé" feel.
Judging rewards design/UX wow (`08`), so the polish budget concentrates here,
on the **Investigation Article**.

**Vite + React SPA** (static, S3 + CloudFront). Stack: React + TypeScript,
Tailwind CSS, shadcn/ui, **Framer Motion** (motion/scroll/transitions),
**Recharts** (charts), **React Flow** (relationship graph), React Router,
`i18next` (bilingual), TanStack Query.

> The mock is a **reference skeleton, not a fixed layout**. The chapter
> *spine* and aesthetic stay constant; the *content scenes inside each chapter
> are data-driven* so investigations never feel the same (see "Dynamic scene
> system").

## Design system (tokens)

**Palette** (dark, high-contrast, single hot accent):

| Token | Value | Use |
|---|---|---|
| `bg/base` | `#0A0A0B` | App canvas |
| `bg/panel` | `#121214` | Cards / chapter panels |
| `bg/panel-2` | `#17171A` | Nested surfaces |
| `accent/red` | `#E10600` | Primary accent, key data, CTAs |
| `accent/red-deep` | `#B0050B` | Hovers, gradients, glow |
| `text/hi` | `#F5F5F5` | Headlines/body |
| `text/mid` | `#9A9AA0` | Secondary |
| `text/dim` | `#5A5A5E` | Labels, meta |
| `line` | `#262629` | Hairlines / dividers |
| `priority/high·med·low` | red · amber `#E6A100` · slate `#6B7280` | Review-priority |

**Typography**

- **Display**: a heavy condensed uppercase face (e.g. *Anton* / *Bebas Neue*)
  for hero + chapter titles ("LA TRAMA DEL PODER"). Huge, tight tracking.
- **Body**: a clean grotesque (*Inter*) for prose/UI.
- **Numeric**: tabular lining figures for animated counters (Q values).
- **Chapter index**: oversized outline/filled numerals ("01"–"05") + small
  letter-spaced uppercase kicker ("EL CASO").

**Texture & depth**: subtle film grain overlay, vignette, duotone
(red→black) treatment on imagery via CSS blend (no heavy assets), soft red
glow on the single most important datum per chapter. Restraint: drama serves
*comprehension*, never accusation — the guardrail tone in `00` still governs
copy.

## Information architecture

Routes unchanged from before; the **Article** becomes the cinematic chaptered
experience, the rest adopt the same design system with **lighter motion**.

| Route | View |
|---|---|
| `/` | **Dashboard** — "war room" radar (landing) |
| `/newsroom` | **Newsroom** — case-file dossier feed |
| `/investigation/:caseKey` | **Investigation Article** — cinematic chapters |
| `/methodology` | **Methodology / About** |

## The Investigation Article — fixed chapter spine

Mirrors the mock 1:1. **The spine (order + aesthetic) is constant; each
chapter's inner *scene* is resolved from data** (next section).

| # | Chapter | Purpose | Maps to |
|---|---|---|---|
| — | **Cover** | Brand kicker, huge headline, dek, buyer/(anon)supplier, Review-Priority, value counter, mode controls | hero |
| 01 | **El Caso** / The Case | What we found, in plain newsroom language | story `elCaso` |
| 02 | **Sigue el Dinero** / Follow the Money | The value story (flow / price / threshold) | story `sigueElDinero` |
| 03 | **Las Conexiones** / The Connections | Buyer→supplier(s) network | story `lasConexiones` |
| 04 | **Evidencia** / Evidence | Field-level traceable evidence (document/datum cards) | evidence panel |
| 05 | **Cronología** / Timeline | Procurement timeline, honest "no public data" markers | story `cronologia` |
| — | **Cierre** / It's Not Over | What it does & doesn't mean + caveat + CTA (Methodology, share, listen) | story `cierre` |

Chapter content & per-chapter prose come from the investigation doc
(chapter-aligned schema, `04`/`06`). The **caveat** ("signals, not proof")
lives in **Cierre** and is mandatory.

## Scene Catalog (fixed scenes, LLM-selected, evidence-bound)

There is **no generative rendering engine**. Each chapter is a **slot**
filled by one **scene** from a **finite catalog of pre-built, polished,
animated components** (React + Framer Motion). Variety comes from *which*
scene runs and the *params* it gets — not from generated layout.

**How a scene is chosen (per chapter):**

1. **Deterministic shortlist.** Detection output (fired rule families) maps to
   a fixed allow-list of scene ids per chapter (table below). This is
   deterministic — the LLM can only pick scenes the data supports.
2. **LLM picks + fills params.** `GenerateStory` (Claude, see `04`) selects
   the best-fitting `sceneId` from that shortlist and fills the scene's
   **typed param schema**.
3. **Evidence-binding validation.** Every **quantitative** param (amounts, %,
   counts, dates, entity ids/names) must reference a signal/evidence value by
   id; a deterministic validator rejects anything the LLM didn't take from the
   evidence. **Presentational** params (captions, emphasis, ordering, which
   2–3 entities to feature) are free.
4. **Default fallback.** On validation failure / bad `sceneId` / missing data,
   the chapter's **guaranteed default scene** renders with params derived
   straight from evidence — the article always renders.

```ts
type Chapter = "cover"|"elCaso"|"sigueElDinero"|"lasConexiones"
             |"evidencia"|"cronologia"|"cierre";
// stored on the investigation (see 06), produced by 04:
type ScenePlanEntry = { sceneId: string; params: object;
                        source: "llm" | "fallback" };
```

**Scene Catalog — 14 in scope** (core default per chapter + high-value
variants; the rule-family → allowed-scene shortlist drives selection):

| Chapter | Core (default) | Variant(s) — shortlisted when… |
|---|---|---|
| Cover | `CoverHeadline` (parallax duotone, mask-reveal headline, value count-up, priority chip) | — |
| 01 El Caso | `CaseStatement` (oversized pull-stat + lead + 3 facts) | `CaseSplit` (text + framed key figure) |
| 02 Sigue el Dinero | `MoneyFlowStreams` (animated buyer→supplier value streams + counters) | `PriceBars` (F3 13/14) · `ThresholdLadder` (F3 15 / F4 18, LCE Q90k/Q900k bands) · `RegionMap` (**stretch only**, geo) |
| 03 Las Conexiones | `ConcentrationFan` (buyer hub, suppliers sized by value, flagged highlighted) | `SplittingCluster` (F4 18) · `RepeatBidders` (F2 10) |
| 04 Evidencia | `EvidenceLedger` (traceable claim→field/value/benchmark cards) | `EvidenceCompare` (benchmarks present) |
| 05 Cronología | `AwardTimeline` (scrubber + markers + "SIN DATO PÚBLICO" gaps) | `GapSpotlight` (F4 20/21 short tender / fast award) |
| Cierre | `ClosingStatement` (what it does/doesn't mean + caveat + CTAs) | — |

Core 7 = MVP; the 7 variants are in scope after the core; `RegionMap` is an
additional **stretch**. Adding a scene later = one component + one shortlist
entry (pluggable, mirrors the rule-engine philosophy). The cinematic shell
stays constant; scene + params make each investigation feel distinct.

## Scene contract (the shared cross-area contract)

This is the single source of truth for the scene param schemas, the
deterministic shortlist, and the validator. `04` (generation) emits params
to this; `06` stores them; this file (frontend) renders them; the validator
in the shared scene package enforces them.

**Param kinds.** Every param is one of:
- **bound** — server-supplied from the investigation/evidence (LLM cannot
  set it): `buyer`, `supplier.displayName*`, `reviewPriority`, dates,
  evidence rows. Passed through verbatim.
- **quantitative** — a number/label the LLM provides **with a `ref`** to a
  signal/evidence id; the validator requires the value to match that
  referenced evidence/signal value (exact for ids/enums, equal for amounts).
- **presentational** — free for the LLM: captions, prose, emphasis target
  (must point at an existing bound/quantitative item), ordering.

`refs` resolve against the case `signals[]`/`evidence[]` (see `06`),
e.g. `ref:"ev:3"` (evidence index) or `ref:"sig:supplier_concentration_per_buyer"`.

### Per-scene param schema — 7 core scenes

| Scene | Params (kind) |
|---|---|
| `CoverHeadline` | `kicker`,`headline`,`dek` (pres) · `heroStat{ label(pres), value(quant+ref), unit(bound) }` · `buyer`(bound) · `supplierDisplay`(bound) · `reviewPriority`(bound) · `bgVariant`(pres enum) |
| `CaseStatement` | `lead`(pres) · `pullStat{ value(quant+ref), label(pres) }` · `facts[3]{ text(pres), valueRef?(quant+ref) }` |
| `MoneyFlowStreams` | `buyer`(bound) · `totalValue`(quant+ref) · `streams[]{ supplierId(bound), supplierDisplay(bound), amount(quant+ref), share(quant+ref) }` · `emphasisSupplierId`(pres, ∈streams) · `caption`(pres) |
| `ConcentrationFan` | `buyer`(bound) · `topShare`(quant+ref) · `suppliers[]{ supplierId(bound), supplierDisplay(bound), value(quant+ref), share(quant+ref), flagged(bound) }` · `caption`(pres) |
| `EvidenceLedger` | `items[]` **fully bound** to `investigation.evidence` `{ field, value, benchmark, comparison }` · `itemCaptions[]`(pres, parallel) · `order`(pres) |
| `AwardTimeline` | `events[]{ date(bound), kind(bound: published\|tenderClose\|award\|contractSigned), label(pres), valueRef?(quant+ref) }` · `missingStages[]`(bound) · `highlightIdx`(pres) · `caption`(pres) |
| `ClosingStatement` | `whatItMeans`(pres) · `caveat`(pres, **required & non-empty**) · `ctas`(bound fixed set: methodology, listen, share) |

The 7 variants (`CaseSplit`, `PriceBars`, `ThresholdLadder`,
`SplittingCluster`, `RepeatBidders`, `EvidenceCompare`, `GapSpotlight`)
follow the same kind-tagged pattern; each variant's full schema is finalized
in its build task (`planning/tasks/06-scene-contract.md`).

### Deterministic shortlist (fired rules → allowed `sceneId`s per chapter)

The LLM may only pick a `sceneId` from the chapter's shortlist; the **first
entry is the guaranteed default**.

| Chapter | Shortlist (default first) → condition to add |
|---|---|
| Cover | `CoverHeadline` (fixed) |
| 01 El Caso | `CaseStatement` · `CaseSplit` (always allowed) |
| 02 Sigue el Dinero | `MoneyFlowStreams` · +`PriceBars` if any of rules 13,14 fired · +`ThresholdLadder` if any of rules 15,18 fired · +`RegionMap` only if region data present **(stretch)** |
| 03 Las Conexiones | `ConcentrationFan` · +`SplittingCluster` if rule 18 fired · +`RepeatBidders` if rule 10 fired |
| 04 Evidencia | `EvidenceLedger` · +`EvidenceCompare` if any signal carries a `benchmark` |
| 05 Cronología | `AwardTimeline` · +`GapSpotlight` if any of rules 20,21 fired |
| Cierre | `ClosingStatement` (fixed) |

(`family` of fired rules: F1=1–6, F2=7–12, F3=13–17, F4=18–23 — see `03`.)

### Evidence-binding validator contract

`validateScenePlan(chapter, planEntry, caseSignals, caseEvidence,
investigation) → { sceneId, params, source }`:

1. `planEntry.sceneId` must be in `shortlist(chapter, firedRules)` — else
   fallback.
2. Every **bound** param must equal the server value (overwrite with the
   authoritative value; ignore LLM).
3. Every **quantitative** param must carry a `ref` that resolves in
   `caseSignals`/`caseEvidence`, and its value must match the referenced
   value (exact for ids/enums/dates; numeric-equal for amounts/shares) —
   else fallback.
4. **presentational** params: shape/length only; an emphasis/`*Id` target
   must reference an existing item in the same scene.
5. `ClosingStatement.caveat` must be present & non-empty (mandatory caveat).
6. Any failure → `{ sceneId: defaultScene(chapter),
   params: deriveFromEvidence(chapter, signals, evidence, investigation),
   source: "fallback" }`. Success → `source: "llm"`.

`deriveFromEvidence` builds the default scene's params purely from
signals/evidence/investigation (no LLM), guaranteeing every chapter renders.
This contract lives in a shared scene package consumed by both the
generation Lambda (`07`/`04`) and the SPA (`ScenePicker`).

## Three navigation modes

A unified **bottom transport bar** + **left chapter rail** drive all modes.

1. **Scroll (default)** — long-form scrollytelling. Chapters pin/animate on
   scroll (Framer Motion scroll progress); left rail tracks the active
   chapter; bottom bar fills as a progress meter.
2. **Presentation mode** (toggle) — full-screen one chapter at a time;
   advance via ◀ ▶ / Space / click / scrubber / keyboard; same scenes scaled
   up; cinematic cross-chapter transitions (mask wipe / fade-through-black).
3. **Podcast mode** (toggle / "Escuchar") — plays the 60s ES/EN narration;
   chapters **auto-advance on approximate per-chapter cue points** emitted by
   the generation step (`04` `podcastCuePoints`). **Tight/word-level sync is
   an explicit non-goal** — cue points are best-effort timestamps; the user
   can always scrub or navigate manually; a subtle "now narrating" highlight
   on the active chapter. Bottom bar doubles as the audio scrubber.

Mode + language toggles live on the right of the bottom bar; brand wordmark
left; chapter ticks/labels center. Mobile: left rail collapses to a top
progress + sheet.

## Motion choreography (Framer Motion)

- **Cover**: slow parallax on the duotone hero image; headline mask-reveal;
  value **count-up**; subtle grain drift.
- **Chapter enter**: section rises + fades (translateY/opacity only),
  staggered children; the single key datum gets a red glow pulse once.
- **Las Conexiones**: graph nodes/edges build in progressively; flagged
  supplier node pulses.
- **Sigue el Dinero**: value streams animate along paths; counters roll.
- **Cronología**: timeline draws left→right; missing stages "stamp" in as
  dimmed "SIN DATO PÚBLICO" markers.
- **Presentation transitions**: fade-through-black / red mask wipe.
- Motion supports comprehension, never decorative noise. **Respect
  `prefers-reduced-motion`**: replace transforms with quick cross-fades, no
  parallax, instant counters.

## Restyled Dashboard / Newsroom / Methodology (same system, lighter motion)

- **Dashboard ("war room" radar, landing)** — reads `dashboardStats` (`07`).
  Animated counters; the punchline **method-breakdown** (≈94.5% Compra
  Directa) as the hero visual; signals-by-family; review-priority
  distribution; monthly trend; "top investigations" as case-file cards.
  Motion = count-ups + reveals only (no chapter engine).
- **Newsroom** — all current investigations as **dossier/case-file cards**
  (kicker number, bilingual headline, buyer + anon-supplier, value, signal
  chips, Review-Priority, 🎧). Current **Edition** = a featured cinematic
  banner on top. Filters: family, priority, buyer, value range, search
  (denormalized fields, `07`); no period filter. Sort priority→recency→value.
- **Methodology / About** — same noir type/grain; data source, period, how
  detection works, limitations, the "signals not proof" stance; linked from
  header + every Cierre.

## Accessibility & performance

- Keyboard: full nav for Presentation mode (arrows/Space/Home/End); focus
  rings on the dark theme; ARIA for the transport + chapter rail.
- `prefers-reduced-motion` honored everywhere (reduced variants above).
- Color contrast checked against the dark palette (text/hi & accent on
  bg/base ≥ WCAG AA for text).
- Perf: animate transform/opacity only; `content-visibility` for offscreen
  chapters; lazy-load chapter media + **code-split scene components**;
  duotone via CSS blend (no large pre-rendered assets); target 60fps; the
  Article must stay smooth on a mid laptop for the live demo.

## Component inventory

`AppShell` · `BrandRail` (left chapter rail) · `TransportBar`
(progress/scrubber/mode+lang toggles) · `MethodologyPage` ·
**Dashboard**: `Counter` · `MethodBreakdownChart` · `SignalsByFamily` ·
`PriorityDistribution` · `TrendChart` · `CaseFileCard` ·
**Newsroom**: `EditionBanner` · `DossierCard` · `FeedFilters` ·
**Article**: `ArticleShell` (spine + mode state) · `ChapterSlot` ·
`ScenePicker` (renders `scenePlan[chapter]`, falls back to the chapter's
default scene) · **catalog scenes** — core: `CoverHeadline`, `CaseStatement`,
`MoneyFlowStreams`, `ConcentrationFan`, `EvidenceLedger`, `AwardTimeline`,
`ClosingStatement`; variants: `CaseSplit`, `PriceBars`, `ThresholdLadder`,
`SplittingCluster`, `RepeatBidders`, `EvidenceCompare`, `GapSpotlight`;
stretch: `RegionMap`* · `PodcastTransport` · `GrainOverlay`.
*(\* = stretch.)*

## API consumption

`GET /stats` → Dashboard · `GET /investigations` (filters/sort) +
`GET /editions/current` → Newsroom · `GET /investigations/{caseKey}` →
Article (returns chapter content, `scenePlan`, `podcastCuePoints`, evidence,
graph data, audio URLs) · audio via CloudFront `/audio/*`. See `07`.
