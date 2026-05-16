# 07 — Pipeline & API

## Step Functions state machine

```txt
EventBridge (monthly schedule)  ──┐
manual invoke {year,month, flags} ─┴─▶ StateMachine

ResolveMonths
  → Map: IngestMonth           (per {year,month}; stream + curate; idempotent)
  → Choice: runBenchmarks?  ── no ─┐
      └ yes → BuildBenchmarks      │
  → Choice: runDetection?   ── no ─┤
      └ yes → RunDetection         │   (apply 23 rules → signals)
  → Choice: runStory?       ── no ─┤
      └ yes → RankAndCluster       │   (caseKey grouping, top-N)
              → Map: GenerateStory │   (Claude, ES+EN; evidenceHash skip)
  → Choice: runAudio?       ── no ─┤
      └ yes → Map: GenerateAudio   │   (ElevenLabs 60s ES+EN → S3)
  → Choice: runPublish?     ── no ─┤
      └ yes → Publish              │   (upsert investigations, build Edition)
  → Done ◀─────────────────────────┘
```

Each task = a Lambda wrapping `@core` logic (no AWS imports in core).

## Stage toggles (SSM, read by Choice states)

| Flag | Effect |
|---|---|
| `INGEST_ONLY=true` | After `Map: IngestMonth`, jump straight to Done (bulk-load mode) |
| `runBenchmarks` | Gate `BuildBenchmarks` |
| `runDetection` | Gate `RunDetection` |
| `runStory` | Gate `RankAndCluster` + `Map: GenerateStory` |
| `runAudio` | Gate `Map: GenerateAudio` |
| `runPublish` | Gate `Publish` |
| `MAX_INVESTIGATIONS_PER_RUN` | Top-N cap in `RankAndCluster` (default ~20) |

Typical bulk workflow: invoke per month with `INGEST_ONLY=true` (Jan…Dec),
then one invoke with all `run*=true` and no `INGEST_ONLY` to process the full
accumulated DB.

## Resilience

- `Map: IngestMonth`: bounded concurrency, retry w/ backoff on
  network/stream errors, `Catch` → failure collector (one bad month doesn't
  abort the run; benchmarks/detection proceed over present data).
- `Map: GenerateStory`/`GenerateAudio`: per-item retry; on hard failure skip
  that case (logged in `pipelineRuns.errors`), continue others.
- All stages idempotent (upserts + `evidenceHash`/audio-key skips) → safe to
  re-run.

## EventBridge

Monthly rule passes the latest `{year,month}` with default flags
(full pass). Manual invokes (CLI/console) pass any `{year,month}` and override
flags for bulk loading or partial re-runs.

## API (API Gateway HTTP API + Lambda)

All read-only; reads MongoDB Atlas; `lang` query param selects ES/EN payload.

| Method · Path | Purpose | Notes |
|---|---|---|
| `GET /stats` | Dashboard radar aggregates | computed from `curatedReleases`/`investigations` (method mix, counters, by-family, priority dist, trend) |
| `GET /editions/latest` | Latest Edition + its investigation cards | `?lang=` |
| `GET /editions/{id}` | A specific past edition | |
| `GET /investigations` | Newsroom feed w/ filters | `?family&method&buyer&minValue&maxValue&period&priority&q&page&lang` |
| `GET /investigations/{caseKey}` | Full article: story, signals, evidence, graph data, audio URLs | `?lang=` |
| `GET /filters` | Facet values for the feed filter UI | |
| `GET /entities/{id}` | Entity drill-down | **stretch** |

Audio served from S3 via CloudFront `/audio/*` (public read for the demo);
URLs returned in the investigation payload.

## Local invocation (fast iteration, still AWS-native)

Because handlers are thin over `@core`, each task is invocable locally
(direct function call / SAM local) against Atlas — used during the 48h build
to iterate detection/story logic without redeploying Step Functions each time.
The deployed target remains the Step Functions pipeline.
