# 09 — API (dev plan)

Spec: [`../09-api.md`](../09-api.md) | Idea refs:
`../../idea/07-pipeline.md` (API table), `../../idea/06-data-model.md`,
`../../idea/05-frontend.md`
Phase: 3 (9.1/9.2) + 4 stretch (9.3) | Depends on: 03, 07, 02 | Blocks:
10, 11, 12 (the SPA consumes it)
Prereqs (`00-sequence.dev.md` §2): Phase 2 exit green
(`investigations`/`editions`/`dashboardStats` populated); HTTP API + stage
throttling deployed (Area 02); `MONGODB_URI` injected as Lambda env (Area 02).

## Routing & reuse

- **Per-route Lambdas** (user decision): one thin `NodejsFunction` per
  endpoint in `backend/src/handlers/` (type-only `aws-lambda`, no AWS SDK —
  purity grep unchanged) + **5 explicit `GET` routes** added to the CDK app.
  Adding the routes is an **Area-09 → `infrastructure/` cross-folder edit**
  (Area 02's folder): additive, reuses Area 02's env-injection/`NodejsFunction`
  bundling pattern, cross-ref'd to Area 02, recorded in `00-sequence.dev.md`.
- Handlers are **thin** over a shared `backend/src/api/` module
  (`params`/`dto`/`project`/`respond`).
- **Reuse, never re-implement:** Area 03 `investigations.getByCaseKey`/
  `list`/`$text`/`distinct`, `editions.getCurrent`,
  `dashboardStats.getCurrent`, `Investigation/Edition/DashboardStats` schemas;
  Area 06 `ScenePlanEntry`/`Chapter` types — all from `backend/src/index.ts`.
  Area 07 already persisted **anonymized** `investigations` (raw names never
  stored). The API is **defense-in-depth**: it only **projects** a public DTO
  and strips internal fields.
- **Additive** to Area 03 (no Area 03 rework): pagination params on
  `investigations.list`; a small value-bounds aggregation for `/filters`.

---

## Epic 9.1 — Read endpoints  (Phase 3)

Goal: the 5 read-only endpoints behind CloudFront `/api/*`.

Steps:
1. `backend/src/api/params.ts` — zod parse/validate of query+path:
   `family` (F1–F4), `priority` (high|medium|low), `buyer`, `minValue`,
   `maxValue`, `q`, `page` (1-based int), `lang` (es|en), and `caseKey`.
   Invalid → typed 400.
2. `backend/src/api/dto.ts` — public response DTOs: `InvestigationListItem`,
   `InvestigationFull`, `StatsDTO`, `EditionDTO`, `FiltersDTO` (built from
   Area 03 `Investigation/Edition/DashboardStats` + Area 06 `ScenePlanEntry`).
3. `backend/src/api/project.ts` — map a stored doc → public DTO: **strip
   `signalIds`** and any raw/internal entity id; for `supplier` keep only
   `displayNameEs/displayNameEn/isIndividual` (drop raw `id` when
   `isIndividual`); a guard asserts no raw-name/internal leakage.
4. `backend/src/api/respond.ts` — consistent JSON envelope; error shape
   `{ error: { code, message } }` (400/404/500, no internal leakage);
   `?lang` selection; per-route `Cache-Control`.
5. `backend/src/handlers/{stats,investigations,investigation,editions,
   filters}.ts` — thin Lambda handlers (type-only `aws-lambda`): parse →
   Area 03 repo → project → respond:
   - `stats.ts` → `dashboardStats.getCurrent()` (single read, no aggregation).
   - `investigations.ts` → `investigations.list({ filters AND-combined,
     `minValue/maxValue` over `totalValue`, `q` via `$text`, sort
     priority(high→med→low)→`updatedAt` desc→`totalValue` desc,
     page })` — **add pagination** to the Area 03 list fn (additive: `page`,
     fixed `pageSize` default 24 → `{ items, page, pageSize, total }`).
   - `investigation.ts` → `investigations.getByCaseKey` → full projected DTO
     (chapter content, `scenePlan`, evidence, audio URLs, anonymized
     supplier; **no `signalIds`/raw ids**); 404 on unknown `caseKey`.
   - `editions.ts` → `editions.getCurrent()`.
   - `filters.ts` → families F1–F4 + priorities (fixed sets) + distinct
     buyers (`investigations.distinct`) + `totalValue` min/max (**add** a
     value-bounds aggregation — additive to the Area 03 `investigations`
     repo).
6. `infrastructure/lib/open-contract-stack.ts` (**Area-09→infra additive
   edit**): 5 `GET` routes — `/stats`, `/investigations`,
   `/investigations/{caseKey}`, `/editions/current`, `/filters` — each →
   its own `NodejsFunction` (entry `../backend/src/handlers/<x>.ts`, same
   `projectRoot`/`depsLockFilePath`/env-injection as the Area 02 `/health`
   function); CloudFront `/api/*` already targets the HTTP API.

Verify (spec *Done:*):
- `/stats` "p95 fast; payload matches Dashboard (idea/05)" →
  `curl https://<cf>/api/stats` returns the `dashboardStats` shape; code
  path is a single `getCurrent()` (no `$group`).
- `/investigations` "each filter + pagination covered by tests; matches
  idea/07" → `investigations.handler.test.ts` per filter + pagination + sort
  (stubbed repo); live curl with each query param.
- `/investigations/{caseKey}` "payload renders the Article with no extra
  calls; raw individual names absent" → DTO carries chapters + `scenePlan` +
  evidence + audio URLs; `project.test.ts` on an **individual-supplier**
  fixture asserts no raw name/id and no `signalIds`.
- `/editions/current` "matches the latest publish run" → equals
  `editions.getCurrent()`.
- `/filters` "facets reflect current data" → families/priorities fixed;
  buyers/value-bounds derived from current `investigations`.

## Epic 9.2 — Cross-cutting  (Phase 3)

Goal: shared response types, `lang`, consistent errors, throttling verified.

Steps:
1. `backend/src/api/dto.ts` is the **single source** of response types
   (re-exported from `backend/src/index.ts`). The SPA obtains them via the
   **established frontend sync pattern** (Area 10/11 concern — cross-ref, not
   built here). `?lang` handling + the consistent error envelope applied by
   every handler via `respond.ts`.
2. Throttling/usage plan = Area 02 stage default (no auth — public data);
   optionally attach a per-route throttle to the 5 routes in the CDK edit.

Verify (spec *Done:*):
- "SPA imports the same types; 4xx/5xx consistent" → DTOs exported from
  `backend`; `respond.test.ts`: 400 (bad param), 404 (unknown caseKey), 500
  envelope — no internal field leakage.
- "burst test bounded by the plan" → a burst against `/api/*` returns
  429s bounded by the Area 02 usage plan.

## Epic 9.3 — Later endpoints  (Phase 4 / stretch)

Goal: documented, not built now.

Steps:
1. `GET /editions/{id}`, `GET /entities/{id}` — documented as Phase-4
   stretch (idea/07); built when their UI lands (Areas 11/12 Phase 4).

Verify (spec *Done:*): implemented in Phase 4 when consumed — **tagged, not
run in Phase 3**.

---

## Files created (at execution)

`backend/src/api/`: `params.ts`, `dto.ts`, `project.ts`, `respond.ts` (+
tests). `backend/src/handlers/`: `stats.ts`, `investigations.ts`,
`investigation.ts`, `editions.ts`, `filters.ts` (+ handler tests + a no-leak
`project` fixture test). Additive Area 03 repo fns in
`backend/src/repositories/investigations.ts` (pagination on `list`;
value-bounds aggregation). Edits: `backend/src/index.ts` (export the DTOs);
`infrastructure/lib/open-contract-stack.ts` (5 routes → 5 `NodejsFunction`s).

## Decisions locked

- Per-route Lambdas (5 thin handlers, type-only `aws-lambda`) + 5 explicit
  CDK `GET` routes — an **Area-09→`infrastructure/` additive edit** (Area 02's
  folder), cross-ref'd to Area 02; backend purity preserved.
- Shared `backend/src/api/` (`params`/`dto`/`project`/`respond`); handlers
  thin; the public-DTO projection + error envelope are reused.
- Reuse Area 03 `investigations.getByCaseKey`/`list`/`$text`/`distinct`,
  `editions.getCurrent`, `dashboardStats.getCurrent`, Area 03/06 types.
  Additive: pagination on `list`; `/filters` value-bounds aggregation.
- API is defense-in-depth over Area 07's anonymized docs: strips `signalIds`
  + raw individual ids/names; no-leak fixture test.
- Pagination `?page` 1-based, `pageSize` default 24, `{items,page,pageSize,
  total}`; filters AND-combined; `minValue/maxValue` over `totalValue`; sort
  priority→`updatedAt` desc→`totalValue` desc; `q` via `$text`; **no
  `period`**.
- Public/read-only/no-auth/no-CORS (same-origin via CF); throttling = Area 02
  stage plan (optional per-route); `?lang` ES/EN; per-route `Cache-Control`.
- Frontend type sharing = established copy/sync pattern (Area 10/11 — cross-
  ref). 9.3 = Phase-4 stretch (documented, not built now).

## Risks

- **Cross-folder edit**: Area 09 modifies `infrastructure/` (Area 02's
  folder) — additive only (5 routes + 5 `NodejsFunction`s), reuses Area 02's
  pattern, recorded here + `00 §0/§4`, cross-ref'd; no infra rework.
- **Pagination not in Area 03** — added as an additive `list` param (no Area
  03 rework); documented.
- **Anonymization invariant** — API must never leak `signalIds`/raw
  individual ids even though Area 07 anonymized at persist; enforced by
  `project.ts` + the no-leak fixture test (defense-in-depth).
- **Deploy-dependent Verifies** need the HTTP API deployed + Phase-2 data;
  offline coverage = handler/params/project unit tests with stubbed repos.
- **`/filters` cost** — live distinct/value-bounds is cheap at MVP (N≈20);
  precompute into `dashboardStats` later if it grows (noted, not now).

## Verification (end-to-end runbook)

```
# offline (stubbed repos)
pnpm --dir backend install && pnpm --dir backend build         # 0 exit
pnpm --dir backend test                                        # params +
                                                               # project (no-leak)
                                                               # + per-handler
                                                               # + respond/errors
grep -rE "@aws-sdk|'aws-sdk'" backend/src                      # no matches
# deployed (Area 02 + cdk deploy; Phase-2 data present)
pnpm --dir infrastructure deploy                               # 5 routes/fns
curl -s https://<cf>/api/stats            | jq .computedAt     # dashboardStats
curl -s "https://<cf>/api/investigations?priority=high&page=1&lang=es" | jq '.items|length'
curl -s https://<cf>/api/investigations/<caseKey>?lang=en | jq '.signalIds'  # null
curl -s https://<cf>/api/editions/current | jq .leadCaseKey
curl -s https://<cf>/api/filters          | jq '.families'     # [F1..F4]
```
All green ⇒ Area 09 satisfies its spec *Done:* criteria and delivers the
"API serves `/stats`, `/investigations`(+filters),
`/investigations/{caseKey}`, `/editions/current`, `/filters`" part of the
Phase 3 exit gate (`00-sequence.dev.md` §4).
