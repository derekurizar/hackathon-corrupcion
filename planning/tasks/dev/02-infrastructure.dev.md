# 02 — Infrastructure (dev plan)

Spec: [`../02-infrastructure.md`](../02-infrastructure.md) | Idea refs:
`../../idea/01-architecture.md`, `../../idea/07-pipeline.md`,
`../../platform.md`
Phase: 0 (CDK skeleton) + 4 (Step Functions/EventBridge) | Depends on: 01 |
Blocks: 09 (API), 10 (`deploy:fe`), 08 (pipeline enable)
Prereqs (`00-sequence.dev.md` §2): **AWS account + `cdk bootstrap`
(Phase 0 BLOCKER)** + creds; region pinned; Node 20 + pnpm; Area 01 root
configs (`tsconfig.base.json`, `eslint.config.mjs`, `.gitignore`) and
`backend/` exist (handler bundling target).

## Structure & decisions

- **Handlers live in `backend/src/handlers/`** (thin adapters: parse event →
  call a `backend` stage → write result), using **type-only** `aws-lambda`
  imports. No runtime AWS SDK in `backend` — the Area-01 purity grep
  (`@aws-sdk|'aws-sdk'`) does not match `aws-lambda`, so it still passes.
- `infrastructure/` is a **standalone TS project** (Area-01 no-workspace
  baseline) depending on `backend` via `file:../backend` — the **second**
  `file:` consumer after `data-integestion/`.
- **Secrets/params → Lambda env vars by CDK**, so `backend` reads
  `process.env` via the Area-01 `loadConfig()` (no AWS SDK anywhere in
  `backend`). Plaintext-in-template tradeoff accepted for the short-lived
  hackathon demo only (see Risks).
- **Single stack** in the single CDK app; region default `us-east-1`
  (override via `CDK_DEFAULT_REGION`); account from CLI creds.
- Epic phases: **2.1 = Phase 0**, 2.2 = Phase 3 enable, 2.3 = Phase 4,
  2.4 = deploy ergonomics (README at Phase 0; `deploy:fe` once `frontend/`
  exists). Only 2.1 (+ the 2.4 README) is built in Phase 0; 2.2/2.3 *Verify*
  steps are gated to their phase — do not run early.

---

## Epic 2.1 — CDK app skeleton  (Phase 0)

Goal: a deployable single-stack CDK app in `infrastructure/`: S3 `web`+`audio`
(private, CloudFront-only), CloudFront with SPA fallback + `/audio/*` +
`/api/*` routing, Secrets/SSM provisioned.

Steps:
1. `infrastructure/` standalone project: `package.json` (private,
   `"type":"module"`, `engines.node>=20`; deps `aws-cdk-lib`,`constructs`;
   devDeps `aws-cdk`,`tsx`,`typescript`,`esbuild`; dep
   `"backend":"file:../backend"`); `tsconfig.json` extends
   `../tsconfig.base.json`; `cdk.json` → `"app":"npx tsx bin/app.ts"`;
   scripts `synth`,`deploy`,`diff` wrapping `cdk`.
2. `bin/app.ts`: `new App()` + `new OpenContractStack(app,'OpenContract',{
   env:{ account: process.env.CDK_DEFAULT_ACCOUNT, region:
   process.env.CDK_DEFAULT_REGION ?? 'us-east-1' }})`.
3. `lib/open-contract-stack.ts`:
   - `webBucket`, `audioBucket` — `blockPublicAccess: BLOCK_ALL`,
     `enforceSSL`, removal/autoDelete for the demo. **No `raw-cache`.**
   - `Distribution`: default behavior → web S3 origin via **OAC**;
     `defaultRootObject:'index.html'`; `errorResponses` 403&404 →
     `/index.html` (200) for SPA routing; additional behavior `/audio/*` →
     audio S3 origin (OAC); additional behavior `/api/*` → `HttpOrigin` of the
     HTTP API (created in 2.2; for Phase 0 use a placeholder origin or guard).
   - Secrets Manager `Secret` (no generated value, no value set):
     `MONGODB_URI`, `ANTHROPIC_API_KEY`, `ELEVENLABS_API_KEY`.
   - SSM `StringParameter` defaults: `ELEVENLABS_VOICE_ES`/`_EN` (empty),
     `MAX_INVESTIGATIONS_PER_RUN`=`20`,
     `RUN_BENCHMARKS`/`RUN_DETECTION`/`RUN_STORY`/`RUN_AUDIO`/`RUN_PUBLISH`
     =`true`, `INGEST_ONLY`=`false`, `BRAND_NAME`, `BRAND_TAGLINE`.
4. `BucketDeployment` of a placeholder `infrastructure/web-placeholder/
   index.html` to `webBucket` (replaced by `deploy:fe` in 2.4).

Verify (spec *Done:*):
- *"`cdk synth` succeeds; `cdk deploy` creates the empty stack"* →
  `pnpm --dir infrastructure synth` exits 0; with bootstrap+creds,
  `pnpm --dir infrastructure deploy` creates `OpenContract`.
- *"buckets exist; `audio` readable via CloudFront only"* → both buckets have
  `BlockPublicAccess=BLOCK_ALL`; direct S3 GET is denied; GET via the
  CloudFront `/audio/*` path (after an object is put) succeeds.
- *"a placeholder `index.html` served over the CF URL"* →
  `curl https://<distribution>.cloudfront.net/` returns the placeholder; an
  unknown deep path also returns it (200, SPA fallback).
- *"params resolvable by a test Lambda; values set out-of-band"* →
  `aws ssm get-parameter --name <…>` returns defaults;
  `aws secretsmanager describe-secret` lists the 3 secrets (values empty until
  2.4).

## Epic 2.2 — API surface wiring  (Phase 3 enable)

Goal: a throttled public HTTP API behind CloudFront `/api/*`, with a `/health`
route proving the `backend/src/handlers` bundling path.

Steps:
1. `aws-cdk-lib/aws-apigatewayv2` `HttpApi` + default `HttpStage` with
   throttling (`throttle: { rateLimit: 50, burstLimit: 100 }` — tunable).
2. `GET /health` → `HttpLambdaIntegration` of a `NodejsFunction`
   (`entry: '../backend/src/handlers/api.ts'`, `projectRoot:'../backend'`,
   `depsLockFilePath:'../backend/pnpm-lock.yaml'`, `runtime: NODEJS_20_X`,
   bundling esbuild). Full routes are Area 09; here `api.ts` returns 200 for
   `/health`. Repoint the Distribution `/api/*` behavior to this HTTP API
   origin.
3. Inject secret/param values as Lambda `environment` (CDK reads SSM +
   Secrets, sets env keys matching the Area-01 `loadConfig()` schema).
4. No CORS configuration (same origin via CloudFront) — leave unset.

Verify (spec *Done:*):
- *"a health route returns 200 through CloudFront `/api/*`; rate limit
  configured"* → `curl https://<cf>/api/health` → 200; synthesized template
  shows the stage throttle settings.
- *"SPA fetch to `/api/*` works with no CORS error"* → from the CF origin in a
  browser, `fetch('/api/health')` resolves with no CORS error.

## Epic 2.3 — Step Functions + EventBridge  (Phase 4)

Goal: the STANDARD pipeline state machine + a disabled monthly EventBridge
rule + least-privilege task roles, per `idea/07`.

Steps:
1. `aws-cdk-lib/aws-stepfunctions` STANDARD state machine:
   `ResolveMonths` → `Map:IngestMonth` (bounded concurrency; `Retry`
   network/stream/unzip with backoff; `Catch` → failure-collector so one bad
   month doesn't abort) → `Choice runBenchmarks` → `BuildBenchmarks` →
   `Choice runDetection` → `RunDetection` → `Choice runStory` →
   `RankAndCluster` → `Map:GenerateStory` (`MaxConcurrency:3`, `Retry` on 429
   with exponential backoff) → `Choice runAudio` → `Map:GenerateAudio`
   (`MaxConcurrency:3`) → `Choice runPublish` → `Publish` → `Done`. An
   `INGEST_ONLY` choice short-circuits to `Done` after `Map:IngestMonth`.
2. Each task = a `NodejsFunction` over the matching
   `../backend/src/handlers/<stage>.ts`. Choice gates read the SSM toggle
   params; `RankAndCluster` reads `MAX_INVESTIGATIONS_PER_RUN`.
3. `aws-events` `Rule`: `schedule: cron(0 6 2 * ? *)` (day 2, 06:00 UTC),
   **`enabled: false`** (an SSM/context flag flipped by Area 08 enables it);
   target = the state machine; input `{year,month,flags}` (latest month,
   default flags).
4. Least-privilege task roles: read the 3 Secrets + SSM params; `GenerateAudio`
   role writes `audioBucket`; default egress to Atlas/Anthropic/ElevenLabs
   (no VPC).

Verify (spec *Done:*):
- *"`cdk synth` includes the state machine; manual start input
  `{year,month,flags}` validates"* → `synth` template contains the state
  machine; `aws stepfunctions start-execution --input '{"year":2026,
  "month":5,"flags":{}}'` validates (Phase 4).
- *"rule present & enabled; target = state machine; cron documented"* → rule
  exists with the cron; created **disabled** here (Area 08 enables it — note
  the deviation from the spec wording, intentional per `00-sequence.md`
  Phase 0 "EventBridge disabled until 08").
- *"each task Lambda runs with no AccessDenied in an end-to-end run"* →
  Phase-4 end-to-end run shows no `AccessDenied` in CloudWatch.

## Epic 2.4 — Deploy ergonomics

Goal: one command publishes the SPA; a fresh operator can deploy from the
README.

Steps:
1. `deploy:fe` (script in `infrastructure/package.json`, per the
   no-workspace per-folder convention): `pnpm --dir ../frontend build` →
   `aws s3 sync ../frontend/dist s3://<webBucket>` → `aws cloudfront
   create-invalidation --paths '/*'`. (Active once `frontend/` exists — Area
   10.)
2. `infrastructure/README.md` header: one-time **out-of-band secret-setting**
   (`aws secretsmanager put-secret-value` for `MONGODB_URI`,
   `ANTHROPIC_API_KEY`, `ELEVENLABS_API_KEY`), `cdk bootstrap`, region pin,
   `synth`/`deploy`/`deploy:fe` usage.

Verify (spec *Done:*):
- *"a content change is live after the command"* → change the placeholder/SPA,
  run `deploy:fe`, the CF URL reflects it after invalidation.
- *"a fresh operator can deploy following the steps"* → the README steps,
  followed top-to-bottom on a clean machine, reach a served CF URL.

---

## Files created (at execution)

`infrastructure/`: `package.json`, `tsconfig.json`, `cdk.json`,
`.gitignore` (cdk.out — or rely on root), `bin/app.ts`,
`lib/open-contract-stack.ts`, `web-placeholder/index.html`, `README.md`.
`backend/src/handlers/`: `api.ts` (Epic 2.2) and one stub per stage
(`ingest.ts`, `benchmarks.ts`, `detect.ts`, `rank.ts`, `story.ts`,
`audio.ts`, `publish.ts`) — thin adapters over `backend` stage fns,
type-only `aws-lambda` import (real logic lands in Areas 04/05/07).

## Decisions locked

- Handlers in `backend/src/handlers/`, type-only `aws-lambda`; no runtime AWS
  SDK in `backend`.
- `infrastructure/` standalone TS CDK project, `file:../backend` dep,
  `cdk.json` app via `tsx`, extends root `tsconfig.base.json`.
- Single stack `OpenContract`; region default `us-east-1`
  (`CDK_DEFAULT_REGION` overridable); account from CLI creds.
- S3 `web`+`audio` private + CloudFront **OAC**; SPA fallback 403/404 →
  `/index.html`. No `raw-cache`.
- CDK creates empty Secrets (set out-of-band) + SSM params with defaults;
  values injected to Lambda **env** by CDK → `backend` reads `process.env`.
- HTTP API + throttling (50/100, tunable); no CORS (same-origin via CF).
- STANDARD state machine per `idea/07`; Map concurrency 3 + 429 backoff;
  EventBridge `cron(0 6 2 * ? *)` created **disabled**, enabled by Area 08.

## Risks

- **AWS not bootstrapped** (Phase 0 blocker): `synth` works offline;
  `deploy`/deploy-time *Verify* need `cdk bootstrap` + creds. Gate on
  `00-sequence.dev.md` §2 checklist.
- **Secrets as Lambda env vars**: values appear in the deployed
  template/console — accepted only for the short-lived demo (matches the
  no-VPC/NAT posture); not production-safe.
- **esbuild across `file:` boundary**: `NodejsFunction` entry is
  `../backend/src/handlers/*`; set `projectRoot`/`depsLockFilePath` to
  `../backend` so `mongodb`/`zod` bundle; `backend` must be installed/built/
  linked first.
- **Phase split**: only Epic 2.1 (+ 2.4 README) is Phase 0; 2.2/2.3 *Verify*
  is gated to Phases 3/4 — tagged so they are not run early.

## Verification (end-to-end runbook)

```
# Phase 0 (needs cdk bootstrap + creds for deploy)
pnpm --dir backend install && pnpm --dir backend build       # handler target
pnpm --dir infrastructure install                            # links backend
pnpm --dir infrastructure synth                              # 0 exit
pnpm --dir infrastructure deploy                             # creates stack
curl -s https://<distribution>.cloudfront.net/ | grep -q placeholder
aws ssm get-parameter --name /open-contract/MAX_INVESTIGATIONS_PER_RUN
aws secretsmanager describe-secret --secret-id open-contract/MONGODB_URI
grep -rE "@aws-sdk|'aws-sdk'" backend/src                     # no matches

# Phase 3
curl -s -o /dev/null -w '%{http_code}' https://<cf>/api/health   # 200

# Phase 4
pnpm --dir infrastructure synth | grep -q StateMachine
aws events list-rules | grep -q OpenContract                 # rule present
```
All green at each phase ⇒ Area 02 satisfies its spec *Done:* criteria and
contributes its share of the Phase 0 / 3 / 4 exit gates
(`00-sequence.dev.md` §4).
