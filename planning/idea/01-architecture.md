# 01 — Architecture (AWS-native)

## Topology

```txt
                      ┌─────────────────────────────────────────┐
   Browser  ──HTTPS──▶│ CloudFront                              │
                      │  ├─ default behavior ─▶ S3 (web, SPA)   │
                      │  └─ /audio/*          ─▶ S3 (audio)      │
                      └───────────────┬─────────────────────────┘
                                      │ /api/*
                                      ▼
                          API Gateway (HTTP API)
                                      │
                                      ▼
                          Lambda (API handlers)  ──▶ MongoDB Atlas
                                                         ▲
   EventBridge (schedule) ─▶ Step Functions ────────────┘
        │                      ResolveMonths
        │                      → Map: IngestMonth  ──▶ S3 (raw-cache, optional)
        │                      → BuildBenchmarks
        │                      → RunDetection
        │                      → RankAndCluster
        │                      → Map: GenerateStory  ──▶ Anthropic (Claude)
        │                      → Map: GenerateAudio  ──▶ ElevenLabs ─▶ S3 (audio)
        └─ manual invoke ─────▶ → Publish
                              (each task = Lambda; logic from @core)
   Secrets Manager / SSM: Mongo URI, Anthropic key, ElevenLabs key,
                          MAX_INVESTIGATIONS_PER_RUN, stage toggles
```

## Build principle: portable `@core`, thin handlers

All ingest / normalize / detect / rank / generate logic lives in a pure
TypeScript core package with **no AWS imports** (`packages/core`). Lambda
handlers are thin adapters: parse event → call `@core` → write result.

Benefits: unit-testable without AWS, locally invocable for fast iteration,
identical behavior in Step Functions. Build approach is **AWS-native first**
(deploy to Step Functions/Lambda early) but the core stays decoupled.

Suggested workspace layout:

```txt
/packages/core        # pure TS: types (re-export assets types), ingest,
                      # normalize, entities, benchmarks, rules, rank, dedup
/packages/handlers    # Lambda entrypoints (API + each Step Functions task)
/infrastructure       # single AWS CDK app (all stacks)
/frontend             # Vite + React SPA
```

## AWS resources (single CDK app)

- **S3**: `web` (SPA build), `audio` (podcast mp3s, ES/EN), `raw-cache`
  (optional cached monthly OCDS files to avoid re-download).
- **CloudFront**: SPA default behavior (SPA fallback to `index.html`);
  `/audio/*` → audio bucket; `/api/*` → API Gateway origin.
- **API Gateway (HTTP API)** + **Lambda** API handlers (Node 20, TS).
- **Step Functions** standard workflow; each task a Lambda; `Map` states for
  per-month ingest, story gen, audio gen.
- **EventBridge** rule (monthly schedule) + manual invoke supported.
- **Secrets Manager / SSM Parameter Store** for secrets & runtime config.
- **MongoDB Atlas** (external; Lambda connects via VPC peering or public SRV
  + IP allowlist — MVP: SRV URI in Secrets, simplest).

## Config & secrets

| Key | Where | Purpose |
|---|---|---|
| `MONGODB_URI` | Secrets Manager | Atlas connection string |
| `ANTHROPIC_API_KEY` | Secrets Manager | Claude story generation |
| `ELEVENLABS_API_KEY` | Secrets Manager | Podcast TTS |
| `MAX_INVESTIGATIONS_PER_RUN` | SSM | Cost guard, default `20`, changeable/removable |
| `STAGES` toggles | SSM | `runBenchmarks/runDetection/runStory/runAudio/runPublish` (bool) |
| `INGEST_ONLY` | SSM | Shortcut: ingest only, skip everything after `Map: IngestMonth` |
| `BRAND_NAME`, `BRAND_TAGLINE` | SSM (FE build env) | Configurable brand |

Stage toggles let the operator bulk-load many months (`INGEST_ONLY=true`,
invoke per month), then run the heavy stages once over the accumulated DB.

## Environments

Single `dev`/demo environment for the hackathon (one CDK stack set). Atlas
free/shared tier. No multi-region. CloudFront + S3 for a stable demo URL.

## Notes / risks

- Lambda 15 min / 10 GB cap drives the per-month fan-out — see `02`.
- Atlas connections from Lambda: reuse a cached client across warm invocations
  (`@core` exposes a memoized connection).
- Mixing Atlas (non-AWS) with Lambda networking is the main infra risk; MVP
  uses public SRV + Atlas IP allowlist (or `0.0.0.0/0` for the demo) to avoid
  VPC/NAT cost and complexity.
