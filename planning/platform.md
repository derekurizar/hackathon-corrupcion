# Platform

**AWS-native**, provisioned by a **single AWS CDK app** (everything except the
external Atlas). Details: [`idea/01-architecture.md`](./idea/01-architecture.md),
[`idea/07-pipeline.md`](./idea/07-pipeline.md).

| Concern | Choice |
|---|---|
| Frontend hosting | S3 (static) + CloudFront |
| API | API Gateway (HTTP API) + Lambda — **public read-only + throttling/usage plan** |
| Pipeline | EventBridge **enabled monthly (safe-day cron)** → Step Functions (ingest → benchmarks → detect → rank → story → audio → publish) |
| Compute | Lambda (Node 20, TS) — thin handlers over a pure `@core` package |
| Database | **MongoDB Atlas — external/pre-existing; NOT provisioned/managed by CDK.** Infra only consumes `MONGODB_URI`. Public SRV + allowlist `0.0.0.0/0` + strong creds + TLS; no VPC/NAT. Collections/indexes: `idea/06-data-model.md` |
| Object storage | S3 — `web`, `audio` (podcasts). **No `raw-cache`** (monthly ZIP processed in Lambda `/tmp`) |
| Secrets / config | Secrets Manager + SSM (Mongo URI, Anthropic & ElevenLabs keys, `ELEVENLABS_VOICE_ES/EN`, `MAX_INVESTIGATIONS_PER_RUN`, stage toggles, brand) |
| IaC | AWS CDK (single app, all stacks; Atlas excluded) |
| Build approach | AWS-native first; `@core` decoupled + local CLI runner (no LocalStack/SAM); local-per-stage then wrap into Lambda/Step Functions |

Constraints driving the design: Lambda 15 min / 10 GB → single per-month
streaming Lambda; monthly source is a **ZIP** (~100 MB+ uncompressed) →
zip→`/tmp`→`yauzl`→`stream-json`, dropping `documents`/`attributes` blobs.
