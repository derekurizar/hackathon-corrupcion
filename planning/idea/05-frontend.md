# 05 — Frontend

**Vite + React SPA** (static, S3 + CloudFront). Stack: React + TypeScript,
Tailwind CSS, shadcn/ui, **Framer Motion** (motion), **Recharts** (charts),
**React Flow** (relationship graph), React Router, `i18next` (bilingual),
lightweight data fetching (TanStack Query or fetch). Reads the API (`07`).

## Bilingual

Global ES/EN toggle in the header. All UI strings via `i18next`. Stories and
podcast come pre-rendered in both languages from the API; the toggle switches
UI + content (text + audio track). **Brand name comes from `BRAND`
config/i18n — never hardcoded.** Tone across all copy =
journalist-investigative (see `00`).

## Routes

| Route | View |
|---|---|
| `/` | **Dashboard** (landing — matches the demo opening) |
| `/newsroom` | **Newsroom feed** |
| `/investigation/:caseKey` | **Investigation Article** |
| `/methodology` | **Methodology / About** (data source, period, how detection works, limitations, "signals not proof") |

`/methodology` is linked from the header and every article footer.

## Views

### 1. Dashboard — national "procurement radar" (landing)

Opening "wow". Reads the precomputed `dashboardStats` snapshot (`07`).

- **Animated counters** (Framer Motion count-up): records scanned, total value
  analyzed, entities, period covered, flagged investigations.
- **Procurement-method breakdown** (Recharts) — the hero stat: ≈**94.5%
  `Compra Directa`** vs full bidding. The single most striking visual.
- **Signals by family** (F1–F4) + **Review-priority distribution**
  (High/Med/Low).
- **Trend over time** — flagged count / value by month.
- **Top investigations** — cards linking into articles.
- Supporting statistics row (top buyers by flagged value — worded as
  "most-flagged", not accusatory).

### 2. Newsroom feed

- Renders **all current published investigations** (not just one Edition).
- The **current Edition** appears as a **featured banner/section** at the top
  (lead investigation + highlights). Past-edition browsing = **stretch**.
- **Investigation cards**: bilingual headline, buyer + (anonymized) supplier
  display, value, signal chips, **Review Priority** badge, "🎧 Listen"
  indicator.
- **Filters** (denormalized fields on the investigation, `07`): signal
  family, priority, buyer, value range, free-text search. *(No period filter —
  single full scope.)*
- Sort: priority → recency → value.

### 3. Investigation Article — one adaptive component (hero = richest data)

A **single adaptive `Article` component** for every investigation; each
section renders only when its data/signals exist. The hero simply has the
richest data. Order:

1. **Animated hero**: bilingual headline, animated value counter, buyer,
   supplier display (anonymized for individuals), **Review Priority** badge,
   summary, language toggle, **embedded 60s podcast player** (ES/EN track
   follows the language toggle).
2. **Procurement timeline** (core): tender published → closed → award →
   contract signed. Stages missing in the data (`tenderPeriod.endDate` ~25%,
   `contracts.dateSigned` ~0.31%) render explicit **"no public data"**
   markers — the gap itself is a transparency point (ties to rule 21).
3. **Buyer→supplier relationship graph** (React Flow): a **single adaptive
   buyer-centric graph** — buyer node + its suppliers sized/weighted by
   awarded value, the flagged supplier highlighted. Used for all families.
   Supplier labels use the anonymized display from the investigation doc.
4. **Price comparison** (Recharts): contract vs family median / peer buyers /
   supplier history (whichever signals fired).
5. **Review-signal cards**: one card per fired signal — plain-language
   explanation + severity.
6. **Evidence panel** (the trust core): each claim → exact OCDS field(s),
   value, benchmark used. Fully traceable.
7. **Story body**: the fixed 4-section template from `04`
   (What we found / Why it was flagged / The evidence / What it does and
   doesn't mean) + key findings.
8. **Methodology & caveat footer**: "signals, not proof" language, fields
   used, data source + period, link to `/methodology`.

Supplier/headline/body text is already anonymized by the generation step —
**no client-side masking**.

## Motion guidelines (Framer Motion)

- Hero counters: count-up on mount; respect `prefers-reduced-motion`.
- Section reveal on scroll (subtle, fast — editorial, not flashy).
- Graph: progressive node/edge build-in.
- Motion supports comprehension, never decorative noise (credibility
  positioning, `00`). Given the judging emphasis (`08`), motion polish on the
  hero, graph, and dashboard is a priority.

## Component inventory

`AppShell` (header/lang toggle/nav) · `MethodologyPage` · `Counter` ·
`MethodBreakdownChart` · `SignalsByFamily` · `PriorityDistribution` ·
`TrendChart` · `EditionBanner` · `InvestigationCard` · `FeedFilters` ·
`Article` (adaptive) · `ArticleHero` · `PodcastPlayer` ·
`ProcurementTimeline` · `RelationshipGraph` · `PriceComparisonChart` ·
`SignalCard` · `EvidencePanel` · `MethodologyFooter`.

## API consumption

`GET /stats` → Dashboard · `GET /investigations` (filters/sort) +
`GET /editions/current` (featured issue) → Newsroom ·
`GET /investigations/{caseKey}` → Article · audio via CloudFront `/audio/*`.
See `07-pipeline.md`.
