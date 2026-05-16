# 07 — Pipeline & API

## Step Functions state machine

```txt
EventBridge (monthly, ENABLED, safe-day cron)  ──┐
manual invoke {year,month, flags}               ─┴─▶ StateMachine

ResolveMonths
  → Map: IngestMonth           (per {year,month}; zip→/tmp→yauzl→stream; idempotent)
  → Choice: runBenchmarks?  ── no ─┐
      └ yes → BuildBenchmarks      │
  → Choice: runDetection?   ── no ─┤
      └ yes → RunDetection         │   (apply 23 rules → signals)
  → Choice: runStory?       ── no ─┤
      └ yes → RankAndCluster       │   (caseKey = sha(buyer.id|family|scope), top-N)
              → Map: GenerateStory │   (Claude Sonnet 4.6, ES+EN; evidenceHash skip)
  → Choice: runAudio?       ── no ─┤
      └ yes → Map: GenerateAudio   │   (ElevenLabs 60s ES+EN, native voices → S3)
  → Choice: runPublish?     ── no ─┤
      └ yes → Publish              │   (upsert investigations + Edition + dashboardStats)
  → Done ◀─────────────────────────┘
```

Each task = a Lambda wrapping `@core` logic (no AWS imports in core). All
`Map` states are **standard `Map`** (no Distributed Map / no nested sharding).

## Stage toggles (SSM, read by Choice states)

| Flag | Effect |
|---|---|
| `INGEST_ONLY=true` | After `Map: IngestMonth`, jump straight to Done (bulk-load mode) |
| `runBenchmarks` | Gate `BuildBenchmarks` |
| `runDetection` | Gate `RunDetection` |
| `runStory` | Gate `RankAndCluster` + `Map: GenerateStory` |
| `runAudio` | Gate `Map: GenerateAudio` |
| `runPublish` | Gate `Publish` (writes investigations, Edition, `dashboardStats`) |
| `MAX_INVESTIGATIONS_PER_RUN` | Top-N cap in `RankAndCluster` (default ~20) |

Typical bulk workflow: invoke per month with `INGEST_ONLY=true` (12 months),
then one invoke with all `run*=true` and no `INGEST_ONLY` to process the full
accumulated DB. (Demo data target: full ~12 months pre-loaded — see `08`.)

## Resilience

- `Map: IngestMonth`: bounded concurrency, retry w/ backoff on
  network/stream/unzip errors, `Catch` → failure collector (one bad month
  doesn't abort the run; later stages proceed over present data).
- `Map: GenerateStory` / `GenerateAudio`: **`MaxConcurrency: 3`** +
  exponential backoff/retry on HTTP **429** (Anthropic/ElevenLabs rate
  limits); on hard failure skip that case (logged in `pipelineRuns.errors`),
  continue others.
- All stages idempotent (guarded keep-latest upsert + `evidenceHash`/audio-key
  skips) → safe to re-run.

## EventBridge

A **monthly rule, enabled**, passes the latest `{year,month}` with default
flags (full pass). The cron is set to a **fixed safe day/time**
(e.g. day 2, 06:00) so it cannot fire during the demo window. Manual invokes
(CLI/console) pass any `{year,month}` and override flags for bulk loading or
partial re-runs (the build/demo path).

## API (API Gateway HTTP API + Lambda)

Public, **read-only**, with an API Gateway **throttling / usage plan**. Reads
the external Atlas; `lang` query param selects ES/EN payload.

| Method · Path | Purpose | Notes |
|---|---|---|
| `GET /stats` | Dashboard radar | reads the precomputed `dashboardStats` snapshot (single fast read) |
| `GET /editions/current` | The featured Edition (lead + highlights) | `?lang=` |
| `GET /investigations` | Newsroom feed — **all current** | filters `?family&priority&buyer&minValue&maxValue&q&page&lang` (no `period`); sort priority→recency→value |
| `GET /investigations/{caseKey}` | Full article: story, signals, evidence, graph data, audio URLs | `?lang=` |
| `GET /filters` | Facet values (family, priority, buyers, value bounds) | |
| `GET /editions/{id}` | A specific past edition | **stretch** |
| `GET /entities/{id}` | Entity drill-down | **stretch** |

Feed filters work off **denormalized fields on `investigations`** (`ruleIds`,
`signalFamily`, `reviewPriority`, `buyer`, `totalValue`). `method` is only
reachable via denormalized `ruleIds`. Audio served from S3 via CloudFront
`/audio/*` (public read); URLs returned in the investigation payload.

## Local invocation (fast iteration, AWS-native target)

Handlers are thin over `@core`, so each stage's logic is run via the **local
Node CLI runner** (`/scripts`) against the **real pre-existing Atlas** during
the build (**no SAM local, no LocalStack**). Step Functions is the deployed
integration target; build order = local `@core` per stage, then wrap as a
Lambda task (see `08`).
