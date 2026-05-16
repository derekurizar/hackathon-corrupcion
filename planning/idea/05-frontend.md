# 05 — Frontend

**Vite + React SPA** (static, S3 + CloudFront). Stack: React + TypeScript,
Tailwind CSS, shadcn/ui, **Framer Motion** (motion), **Recharts** (charts),
**React Flow** (relationship graph), React Router, lightweight data fetching
(TanStack Query or fetch). Reads the API (`07`).

## Bilingual

Global ES/EN toggle in the header. All UI strings via i18n (e.g. `i18next`).
Stories/podcast come pre-rendered in both languages from the API; the toggle
switches both UI and content (text + audio track). **Brand name comes from
`BRAND` config/i18n — never hardcoded.**

## Views (3)

### 1. Dashboard — national "procurement radar"

Opening "wow". Components:

- **Animated counters** (Framer Motion count-up): records scanned, total value
  analyzed, entities, period covered (months), flagged investigations.
- **Procurement-method breakdown** (Recharts) — the hero stat: ≈**94.5%
  `Compra Directa`** vs full bidding. The single most striking visual.
- **Signals by family** (F1–F4) + **Review-priority distribution**
  (High/Med/Low).
- **Trend over time** — flagged count / value by month.
- **Top investigations** — cards linking into articles.
- Supporting statistics row (top buyers/suppliers by flagged value — worded as
  "most-flagged", not accusatory).

### 2. Newsroom feed — latest Edition

- Edition header (issue id, date, issue stats).
- **Investigation cards**: bilingual headline, buyer→supplier, value, signal
  chips, **Review Priority** badge, "🎧 Listen" indicator.
- **Filters**: signal family, procurement method, buyer, value range, period,
  priority. Free-text search. Past-editions selector.
- Sort: priority → recency → value.

### 3. Investigation Article — hero, full anatomy

The polished centerpiece. Order:

1. **Animated hero**: bilingual headline, animated value counter, buyer,
   supplier, **Review Priority** badge, summary, language toggle,
   **embedded 60s podcast player** (ES/EN track follows language).
2. **Procurement timeline**: tender published → closed → award → contract
   signed; missing/gap stages visibly flagged. Animated reveal.
3. **Buyer→supplier relationship graph** (React Flow): institution & supplier
   nodes, contract edges with totals; other suppliers for comparison.
4. **Price comparison** (Recharts): contract vs category median / peer buyers /
   supplier history (whichever signals fired).
5. **Review-signal cards**: one card per fired signal — plain-language
   explanation + severity.
6. **Evidence panel** (the trust core): each claim → exact OCDS field(s),
   value, benchmark used. Fully traceable.
7. **Methodology & caveat footer**: "signals, not proof" language, fields
   used, data source + period.

## Motion guidelines (Framer Motion)

- Hero counters: count-up on mount; respect `prefers-reduced-motion`.
- Section reveal on scroll (subtle, fast — editorial, not flashy).
- Graph: progressive node/edge build-in.
- Keep it serious: motion supports comprehension, never decorative noise
  (matches the credibility positioning in `00`).

## Component inventory (high level)

`AppShell` (header/lang toggle/nav) · `Counter` · `MethodBreakdownChart` ·
`SignalsByFamily` · `PriorityDistribution` · `TrendChart` ·
`InvestigationCard` · `FeedFilters` · `ArticleHero` · `PodcastPlayer` ·
`ProcurementTimeline` · `RelationshipGraph` · `PriceComparisonChart` ·
`SignalCard` · `EvidencePanel` · `MethodologyFooter`.

## API consumption

`GET /stats` → Dashboard · `GET /editions/latest` + `GET /investigations`
(filters) → Newsroom · `GET /investigations/{caseKey}` → Article · audio via
CloudFront `/audio/*`. See `07-pipeline.md`.
