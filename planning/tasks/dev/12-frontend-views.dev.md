# 12 — Frontend: Dashboard / Newsroom / Methodology (dev plan)

Spec: [`../12-frontend-views.md`](../12-frontend-views.md) | Idea refs:
`../../idea/05-frontend.md` (Dashboard radar, Newsroom feed + Edition +
filters, Methodology), `../../idea/00-product.md` +
`../../idea/03-detection-rules.md` (Methodology content)
Phase: 3 (Dashboard/Newsroom/Methodology) → 4 (Epic 12.4 polish) | Depends
on: 10, 09 | Blocks: —
Prereqs (`00-sequence.dev.md` §2): Phase 2 exit green; Area 10 foundation in
`frontend/` (hooks/schemas/shell/tokens/i18n/Recharts); a served API (Area
09) + Phase-2 data for the live Verifies.

## Reuse & phase split

- **Consumer-only**, edits **only `frontend/`** — replaces the Area-10
  **placeholders** for `/`, `/newsroom`, `/methodology` (the
  `/investigation/:caseKey` route is Area 11; Area 12 only `<Link>`s to it).
- **Reuse, never re-implement:** Area 10 hooks `useStats` /
  `useInvestigations({family,priority,buyer,minValue,maxValue,q,page})` /
  `useCurrentEdition` / `useFilters`; zod `StatsDTO` /
  `InvestigationListItem` / `EditionDTO` / `FiltersDTO`;
  `AppShell`/`BrandRail`/`TransportBar`; noir tokens + `GrainOverlay`/duotone
  + `priority/*` colors; i18n ES/EN; the loading/empty/error pattern; the
  pinned **Recharts** dep. No new hooks/schemas — only Area-12 view
  components + filter/pagination UI state.
- **Phase split (spec-explicit, matches 00-sequence — no conflict):**
  Epics 12.1–12.3 = **Phase 3**; **Epic 12.4 "Polish" = Phase 4 depth**
  (the spec self-tags it; `00-sequence` defers "11/12 a11y/perf/polish" to
  Phase 4). Recorded; no question.

---

## Epic 12.1 — Dashboard ("war-room radar", `/`)  (Phase 3)

Goal: the landing Dashboard renders the `dashboardStats` snapshot.

Steps:
1. `frontend/src/views/Dashboard.tsx` (replace the Area-10 `/` placeholder)
   consuming `useStats()` (`StatsDTO`). Components in
   `frontend/src/views/dashboard/`:
   - `Counters.tsx` — Framer-Motion count-ups (tabular numerics) for
     `counters.{records,valueAnalyzed,entities,monthsCovered,investigations}`.
   - `MethodBreakdownChart.tsx` — Recharts **BarChart** hero (≈94.5% Compra
     Directa "punchline" from `methodBreakdown`).
   - `SignalsByFamily.tsx` — Recharts **RadarChart** over F1–F4 from
     `byFamily` (the "radar" centerpiece).
   - `PriorityDistribution.tsx` — Recharts **BarChart** high/med/low using
     the Area-10 `priority/*` colors from `priorityDist`.
   - `TrendChart.tsx` — Recharts **LineChart** monthly from `trend`.
   - `TopInvestigations.tsx` — `CaseFileCard` list (top buyers/
     investigations), each `<Link>` to `/investigation/:caseKey`.
   Motion = count-ups + reveals only (no chapter engine); honor
   `prefers-reduced-motion` baseline (full variants = Epic 12.4).

Verify (spec *Done* "matches idea/05; counters animate; respects
reduced-motion"): Dashboard renders all blocks from a recorded `/stats`
sample; counters animate; with `prefers-reduced-motion` counters are
instant; visuals match `../../assets/ui_idea.png` language.

## Epic 12.2 — Newsroom (`/newsroom`)  (Phase 3)

Goal: the dossier feed + current Edition banner + filters/sort, URL-syncable.

Steps:
1. `frontend/src/views/Newsroom.tsx` (replace the `/newsroom` placeholder).
   Components in `frontend/src/views/newsroom/`:
   - `DossierCard.tsx` — kicker №, bilingual headline (i18n lang), buyer +
     **anonymized supplier display only** (`displayName{Es,En}`/
     `isIndividual` — never raw id/name), value, signal chips,
     Review-Priority chip (`priority/*` colors), 🎧 affordance; whole card
     `<Link to={`/investigation/${caseKey}`}>` (Area 11 route).
   - `EditionBanner.tsx` — `useCurrentEdition()` (`EditionDTO`: lead +
     highlights + stats) as the featured banner.
   - `FeedFilters.tsx` — family / priority / buyer / value-range / search
     controls (buyer + value-bounds options from `useFilters()`); sort
     priority→recency→value; **no period filter**. Filter + `page` state =
     **React Router search params** (single source of truth, URL-syncable);
     `useInvestigations()` consumes the parsed params; pagination UI over the
     `{items,page,pageSize,total}` envelope.

Verify (spec *Done*): "cards match idea/05; anonymized supplier display
only" → `DossierCard.test.tsx` on an individual-supplier case asserts no raw
supplier id/name; "reflects `GET /editions/current`" → banner equals
`useCurrentEdition`; "filters/sort hit `GET /investigations`; URL-syncable"
→ changing a filter updates the URL + refetches; reloading the URL restores
filter+page state.

## Epic 12.3 — Methodology / About (`/methodology`)  (Phase 3)

Goal: the static bilingual methodology page with a dynamic period.

Steps:
1. `frontend/src/views/Methodology.tsx` (replace the `/methodology`
   placeholder; same noir system): static bilingual i18n sections — data
   source, **period/scope dynamic** from `useStats()`
   (`counters.monthsCovered`/period), how detection works, limitations, the
   "signals not proof" stance; copy accurate to `idea/00` + `idea/03`. Add
   the Methodology link to the `AppShell` header (the per-Cierre link is
   already rendered by Area 11's `ClosingStatement`).

Verify (spec *Done* "content accurate to idea/00/03; bilingual"): page
renders in both ES and EN; period reflects live `/stats`; copy reviewed
against `idea/00`/`idea/03`.

## Epic 12.4 — Polish  (Phase 4 depth)

Goal: noir empty/error/loading + responsive + reduced-motion across the 3
views.

Steps:
1. Empty/error states + loading skeletons in the noir style for Dashboard /
   Newsroom / Methodology; responsive (mobile: rail → top progress + sheet
   per idea/05); full `prefers-reduced-motion` variants; lightweight motion
   only (count-ups/reveals, no chapter engine).

Verify (spec *Done* "views usable on small screens and reduced-motion"):
small-viewport + reduced-motion runs of all 3 views; API error/empty paths
render the noir states. **Phase 4 — tagged, not built in P3.**

---

## Files created (at execution)

`frontend/src/views/`: `Dashboard.tsx`, `Newsroom.tsx`, `Methodology.tsx`;
`frontend/src/views/dashboard/{Counters,MethodBreakdownChart,SignalsByFamily,
PriorityDistribution,TrendChart,TopInvestigations}.tsx`;
`frontend/src/views/newsroom/{DossierCard,EditionBanner,FeedFilters}.tsx`
(+ `useFeedParams` URL-search-params helper) + tests
(`DossierCard.test.tsx`, `FeedFilters.test.tsx`, dashboard sample-render
tests). Edits: `frontend/src/App.tsx` (route the 3 placeholders to the new
views), `frontend/src/shell/AppShell.tsx` (add the Methodology header link),
`frontend/src/i18n/{en,es}.json` (view + methodology copy). **No edits
outside `frontend/`.**

## Decisions locked

- Consumer-only; edits **only `frontend/`**; replaces the Area-10 `/`,
  `/newsroom`, `/methodology` placeholders.
- Reuse Area 10 hooks/zod-schemas/shell/tokens/i18n/Recharts (no new
  hooks/schemas; only view components + filter/pagination UI state).
- Recharts mappings (idea/05 leaves types open): method-breakdown =
  BarChart hero; signals-by-family = **RadarChart** (the "radar"); priority
  distribution = BarChart (`priority/*` colors); trend = LineChart; counters
  = Framer-Motion count-ups. Reviewed vs `ui_idea.png` at execution.
- Newsroom filter + `page` state = **React Router search params**
  (URL-syncable); buyer/value-bounds options from `useFilters`.
- Methodology period/scope **dynamic** from `useStats`; rest static
  bilingual i18n from `idea/00` + `idea/03`; header link added by Area 12;
  per-Cierre link already in Area 11.
- Anonymized supplier display only (defense-in-depth over Area 07/09).
- Phase split: 12.1–12.3 = Phase 3; **Epic 12.4 polish = Phase 4**
  (spec-explicit, matches 00-sequence — recorded).
- Newsroom/dashboard cards `<Link>` → `/investigation/:caseKey` (Area 11
  owns the route).

## Risks

- **Chart types not pinned by idea/05** — locked conventional Recharts
  defaults; spec *Done* = "matches idea/05" → review vs
  `../../assets/ui_idea.png` at execution; chart swap is cheap/isolated.
- **Data-dependent Verifies** need a served API (Area 09) + Phase-2 data;
  offline coverage = recorded-sample fixtures + Area-10 zod schema tests +
  `vite preview`.
- **URL-sync edge cases** (invalid/missing params) — `FeedFilters` parses
  via the Area-10 zod bounds + sane defaults; covered by `FeedFilters.test`.
- **Phase scope** — Epic 12.4 is Phase-4-tagged so P3 isn't over-scoped;
  baseline reduced-motion (instant counters) is inherent in 12.1's *Done*.

## Verification (end-to-end runbook)

```
# offline (recorded /stats, /investigations, /editions/current, /filters
# samples; reuse Area-10 zod schemas)
pnpm --dir frontend install
pnpm --dir frontend typecheck && pnpm --dir frontend lint      # clean
pnpm --dir frontend test                                       # Dashboard
                                                               # sample-render +
                                                               # DossierCard anon +
                                                               # FeedFilters URL-sync
pnpm --dir frontend build && pnpm --dir frontend preview       # local SPA
# with served API + Phase-2 data
#  /           Dashboard: counters animate, BarChart/RadarChart/Line render
#  /newsroom   cards + Edition banner; change a filter -> URL + refetch;
#              reload URL -> state restored; card -> /investigation/<caseKey>
#  /methodology bilingual; period reflects live /stats
#  prefers-reduced-motion -> counters instant (baseline)
```
All P3 checks green ⇒ Area 12 delivers the "Dashboard (radar from
`dashboardStats`) + Newsroom (all current investigations + current Edition) +
Methodology" part of the Phase 3 exit gate (`00-sequence.dev.md` §4). The
Epic 12.4 polish (empty/error/skeletons/responsive/reduced-motion) is
Area 12 **Phase 4**.
