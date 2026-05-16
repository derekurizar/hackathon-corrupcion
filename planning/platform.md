# Platform

**AWS-native**, provisioned by a **single AWS CDK app**. Details:
[`idea/01-architecture.md`](./idea/01-architecture.md),
[`idea/07-pipeline.md`](./idea/07-pipeline.md).

| Concern | Choice |
|---|---|
| Frontend hosting | S3 (static) + CloudFront |
| API | API Gateway (HTTP API) + Lambda |
| Pipeline | EventBridge schedule → Step Functions (ingest → benchmarks → detect → rank → story → audio → publish) |
| Compute | Lambda (Node 20, TS) — thin handlers over a pure `@core` package |
| Database | MongoDB Atlas (external; public SRV + IP allowlist for the demo) |
| Object storage | S3 — `web`, `audio` (podcasts), `raw-cache` (optional OCDS file cache) |
| Secrets / config | Secrets Manager + SSM (Mongo URI, Anthropic & ElevenLabs keys, `MAX_INVESTIGATIONS_PER_RUN`, stage toggles) |
| IaC | AWS CDK (single app, all stacks) |
| Build approach | AWS-native first; `@core` decoupled & locally invocable for fast iteration |

Constraints driving the design: Lambda 15 min / 10 GB → per-month streaming
fan-out; ~100 MB+ monthly OCDS files → selective extraction (drop
`documents`/`attributes` blobs).
