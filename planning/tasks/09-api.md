# 09 — API (API Gateway + Lambda)

Spec refs: `../idea/07-pipeline.md` (API surface), `../idea/06`, `../idea/05`
(consumption). Phase 3. Depends on: 03, 07, 02.

Public, **read-only**, throttled. `lang` query selects ES/EN payload.

## Epic 9.1 — Read endpoints
- [ ] `GET /stats` → reads the single `dashboardStats` doc (no aggregation).
  *Done:* p95 fast; payload matches Dashboard needs (`../idea/05`).
- [ ] `GET /investigations` → **all current**, filters
  `family,priority,buyer,minValue,maxValue,q`, pagination, sort
  priority→recency→value. **No `period`.**
  *Done:* each filter + pagination covered by tests; matches `../idea/07`.
- [ ] `GET /investigations/{caseKey}` → full article: chapter content,
  `scenePlan`, evidence, graph data, audio URLs, anonymized supplier.
  *Done:* payload renders the Article with no extra calls; raw individual
  names absent.
- [ ] `GET /editions/current` → featured Edition (lead + highlights + stats).
  *Done:* matches the latest publish run.
- [ ] `GET /filters` → facet values for the feed UI.
  *Done:* facets reflect current data.

## Epic 9.2 — Cross-cutting
- [ ] Shared response types (reuse `@core`/`@scene-contract` types); `lang`
  handling; consistent error shape.
  *Done:* SPA imports the same types; 4xx/5xx consistent.
- [ ] Throttling / usage plan verified; no auth (public data).
  *Done:* burst test bounded by the plan.

## Epic 9.3 — Later endpoints (Phase 4/stretch)
- [ ] `GET /editions/{id}`, `GET /entities/{id}`.
  *Done:* implemented when their UI lands; spec'd as stretch in `../idea/07`.
