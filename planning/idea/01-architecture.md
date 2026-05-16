# 01 — Architecture (AWS-native)

## Topology

```txt
                      ┌─────────────────────────────────────────┐
   Browser  ──HTTPS──▶│ CloudFront                              │
                      │  ├─ default behavior ─▶ S3 (web, SPA)   │
                      │  ├─ /audio/*          ─▶ S3 (audio)      │
                      │  └─ /api/*            ─▶ API Gateway     │
                      └───────────────┬─────────────────────────┘
                                      ▼
                          API Gateway (HTTP API, public read-only + throttling)
                                      │
                                      ▼
                          Lambda (API handlers)  ──▶ MongoDB Atlas (external)
                                                         ▲
   EventBridge (monthly, enabled) ─▶ Step Functions ────┘
        │                      ResolveMonths
        │                      → Map: IngestMonth  (zip → /tmp → yauzl → stream)
        │                      → BuildBenchmarks
        │                      → RunDetection
        │                      → RankAndCluster
        │                      → Map: GenerateStory  ──▶ Anthropic (Claude Sonnet 4.6)
        │                      → Map: GenerateAudio  ──▶ ElevenLabs ─▶ S3 (audio)
        └─ manual invoke ─────▶ → Publish (writes investigations + dashboardStats)
                              (each task = Lambda; logic from @core)
   Secrets Manager / SSM: Mongo URI, Anthropic key, ElevenLabs keys,
       ELEVENLABS_VOICE_ES/EN, MAX_INVESTIGATIONS_PER_RUN, stage toggles
```

## Build principle: portable `@core`, thin handlers

All ingest / normalize / detect / rank / generate logic lives in a pure
TypeScript core package with **no AWS imports** (`packages/core`). Lambda
handlers are thin adapters: parse event → call `@core` → write result.

Benefits: unit-testable without AWS, locally invocable for fast iteration,
identical behavior in Step Functions. Build approach is **AWS-native first**
(deploy to Step Functions/Lambda) but the core stays decoupled.

Suggested workspace layout:

```txt
/packages/core        # pure TS: types (re-export assets types), ingest,
                      # normalize, entities, benchmarks, rules, rank, dedup
/packages/handlers    # Lambda entrypoints (API + each Step Functions task)
/scripts              # local @core CLI runner (dev loop)
/infrastructure       # single AWS CDK app (all stacks)
/frontend             # Vite + React SPA
```

### Dev loop (fast iteration despite AWS-native target)

- `@core` has unit tests.
- A **local Node CLI runner** (`/scripts`) invokes ingest / detect /
  benchmarks / generate directly against the **real (pre-existing) Atlas
  cluster** — the primary iteration loop while building.
- **No LocalStack, no SAM local.** Step Functions is used for integration once
  `@core` for a stage is solid (see `08` sequencing: local `@core` per stage,
  then wrap as a Lambda task).

## AWS resources (single CDK app)

- **S3**: `web` (SPA build), `audio` (podcast mp3s, ES/EN). *(No `raw-cache`
  bucket — the monthly file is a zip processed in Lambda `/tmp`, see `02`.)*
- **CloudFront**: SPA default behavior (fallback to `index.html`);
  `/audio/*` → audio bucket; `/api/*` → API Gateway origin.
- **API Gateway (HTTP API)** + **Lambda** API handlers (Node 20, TS).
  Public, read-only, with an **API Gateway throttling / usage plan**.
- **Step Functions** standard workflow; each task a Lambda; standard `Map`
  states (no Distributed Map / no nested sharding) for per-month ingest,
  story gen, audio gen.
- **EventBridge** rule (monthly schedule, **enabled**) + manual invoke.
- **Secrets Manager / SSM Parameter Store** for secrets & runtime config.
- **MongoDB Atlas** — **external, pre-provisioned by the user. CDK does NOT
  create or manage the cluster.** Infra only consumes `MONGODB_URI` from
  Secrets. Required collections/indexes are specified authoritatively in
  `06-data-model.md`.

## Config & secrets

| Key | Where | Purpose |
|---|---|---|
| `MONGODB_URI` | Secrets Manager | External Atlas connection string (SRV) |
| `ANTHROPIC_API_KEY` | Secrets Manager | Claude story generation |
| `ELEVENLABS_API_KEY` | Secrets Manager | Podcast TTS |
| `ELEVENLABS_VOICE_ES` | SSM | Native Spanish narrator voice id |
| `ELEVENLABS_VOICE_EN` | SSM | Native English narrator voice id |
| `MAX_INVESTIGATIONS_PER_RUN` | SSM | Cost guard, default `20`, changeable/removable |
| `STAGES` toggles | SSM | `runBenchmarks/runDetection/runStory/runAudio/runPublish` (bool) |
| `INGEST_ONLY` | SSM | Shortcut: ingest only, skip everything after `Map: IngestMonth` |
| `BRAND_NAME`, `BRAND_TAGLINE` | SSM (FE build env) | Configurable brand |

Stage toggles let the operator bulk-load many months (`INGEST_ONLY=true`,
invoke per month), then run the heavy stages once over the accumulated DB.

## Security

- API is intentionally public (all data is already-public procurement info)
  and **read-only**; abuse is bounded by an API Gateway **throttling / usage
  plan** (rate + burst limits).
- **Atlas networking:** public SRV URI in Secrets, Atlas IP allowlist
  `0.0.0.0/0`, strong credentials, TLS. **No VPC / NAT** for the hackathon
  (acceptable for a short-lived demo; avoids cost + setup time). This is the
  single chosen approach (not an either/or).

## Ingest compute decision

Ingestion is a **single per-month Lambda**, streaming + selective extraction
(zip → `/tmp` → `yauzl` → `stream-json`, dropping `tender.documents[]` /
`items.attributes[]`). With ~17k records/month and the compressed download
this stays well under the **15 min / 10 GB** cap. **No checkpoint/sharding or
Fargate fallback in the MVP** — the small risk is accepted.

## Environments

Single `dev`/demo environment (one CDK stack set). No multi-region.
CloudFront + S3 for a stable demo URL.

## Notes / risks

- Atlas connections from Lambda: reuse a cached client across warm invocations
  (`@core` exposes a memoized connection).
- Atlas is external/pre-existing; the only Atlas dependency in IaC is the
  `MONGODB_URI` secret.
