# 00 — Build Sequence (product-quality, dependency-ordered)

This is the **global order** for building a solid product. It is driven by
**dependencies and product quality**, not by reaching a demo. The demo
walkthrough in `../idea/08-scope-and-demo.md` is a non-driving reference only.

Areas are the per-area files `01`–`12` in this folder. Each phase below lists
the areas it advances, the cross-area dependencies, and exit criteria.

Granularity: each area file = epics → fine-grained subtasks (≤ ~half-day),
every subtask has a done-criterion and a spec ref (`../idea/NN`).

---

## Phase 0 — Foundation

Goal: a deployable skeleton + the contracts everything else depends on.

- **Area 01 Workspace & tooling** — pnpm workspaces, TS, Vitest, Zod, lint,
  shared OCDS types from `../assets`, local `.env`, `@core` CLI runner.
- **Area 02 Infrastructure** — single CDK app skeleton: S3 web/audio,
  CloudFront, API Gateway, empty Lambdas, Step Functions shell, EventBridge
  (disabled until 08), Secrets/SSM. **Atlas external — consume `MONGODB_URI`
  only.**
- **Area 03 Core & data model** — `@core` package, memoized Mongo client,
  the 8 collections + indexes (`../idea/06`), repositories.
- **Area 06 Scene contract** — implement the pinned contract
  (`../idea/05` → "Scene contract"): Zod param schemas, shortlist map,
  evidence-binding validator + `deriveFromEvidence` default scenes. Shared
  package, no UI yet.

Dependencies: 01 → (02, 03, 06). 06 depends on 03 types.
**Exit:** `cdk deploy` succeeds; `@core` connects to Atlas; collections+indexes
created; scene-contract validator unit-tested with fixtures.

## Phase 1 — Data path

Goal: real curated data + signals in Atlas.

- **Area 04 Ingestion** — ZIP-structure **spike** first; then
  fetch→/tmp→`yauzl`→`stream-json`, curate/normalize, entity resolution +
  `entityType` hint, keep-latest idempotent upsert, `IngestMonth`.
- **Area 05 Benchmarks & detection** — benchmark stage, pluggable rule
  engine, 23 rules + default `RuleConfig`, review-priority, family→scene
  shortlist output.

Dependencies: 04 → 05 (benchmarks/detection read `curatedReleases`). Both
depend on 03 (collections) + 01 (CLI runner to iterate locally vs Atlas).
**Exit:** ≥1 month ingested; benchmarks computed; signals written for the
full rule set on real data; spot-checked vs `../idea/03`.

## Phase 2 — Intelligence

Goal: investigations + editions + dashboard stats persisted.

- **Area 07 Generation** — RankAndCluster, `caseKey`/`evidenceHash` dedup,
  Claude Sonnet 4.6 chapter-aligned generation + `scenePlan` (uses Area 06
  validator) + guardrail post-checks + retry/fallback, ElevenLabs ES/EN +
  cue points, Editions, `dashboardStats`.

Dependencies: 07 → 05 (signals), 06 (validator), 03 (investigations/editions),
02 (audio S3 + secrets).
**Exit:** top-N investigations persisted with valid `scenePlan`, bilingual
content, audio in S3, an Edition + `dashboardStats` doc; guardrail checks
pass; re-run is idempotent (`evidenceHash`).

## Phase 3 — Delivery

Goal: the product is usable end-to-end through the UI.

- **Area 09 API** — `/stats`, `/investigations`(+filters),
  `/investigations/{caseKey}`, `/editions/current`, `/filters`.
- **Area 10 Frontend foundation** — Vite SPA, noir design system, i18n,
  routing, `AppShell`/`BrandRail`/`TransportBar`, data layer, S3/CloudFront
  deploy.
- **Area 11 Frontend — cinematic Article** — chapter spine, `ScenePicker`,
  the **7 core scenes**, Scroll → Presentation → Podcast modes.
- **Area 12 Frontend — Dashboard/Newsroom/Methodology**.

Dependencies: 09 → 07 (data) + 03. 10 → 09. 11 → 10 + 06 (scene
components/validator) + 09. 12 → 10 + 09.
**→ First usable product increment** (definition below) is reached at the end
of Phase 3.

## Phase 4 — Hardening & depth

Goal: a complete, robust product.

- **04/05**: full ~12-month ingest; all 23 rules tuned on the full corpus.
- **06/11**: the **7 high-value scene variants**; `RegionMap` (stretch).
- **08 Pipeline**: enable EventBridge monthly (safe-day cron), stage
  toggles, resilience/`MaxConcurrency 3`, partial-success, end-to-end run.
- **11/12**: accessibility (`prefers-reduced-motion`, keyboard), perf budget
  (60fps, code-split scenes), polish.
- Cross-cutting: observability, guardrail/e2e tests, copy pass.

Dependencies: 08 wraps the Phase 1–2 `@core` stages as Step Functions tasks
(local `@core` already proven). Phase 4 items are independent and
parallelizable after Phase 3.

---

## First usable product increment (exit of Phase 3)

The product is "usable" — **not** a demo target — when, from real ingested
data:

- ingestion → benchmarks → detection → generation ran for ≥ several months;
- the SPA serves the Dashboard (radar from `dashboardStats`), the Newsroom
  (all current investigations + current Edition), and the cinematic Article
  with the 7 core scenes in Scroll mode, fully bilingual with podcast;
- every article claim is evidence-traceable; individual suppliers anonymized;
  the caveat is present in text + audio;
- it is deployed (S3/CloudFront + API + Atlas), reproducible via the `@core`
  CLI and (Phase 4) the Step Functions pipeline.

Everything beyond this (variants, all rules, full year, geo, presentation/
podcast-mode refinements) is depth added in Phase 4 — valuable, not gating.

## Critical dependency chain (one-line)

`01 → 02/03 → 06 → 04 → 05 → 07 → 09 → 10 → 11/12 → 08 → (Phase 4 depth)`
