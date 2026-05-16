# infrastructure

AWS CDK app for the **Expediente Público / Open Contract Newsroom** project.

This is a **standalone TypeScript project** (NOT a pnpm workspace). It installs and
runs in isolation via `pnpm --dir infrastructure <script>`, and consumes the shared
`backend/` package through a `file:../backend` link (the same consumer-link pattern
used by `data-integestion/`).

CDK code is executed directly from source through `tsx` — there is no `build` step.
Type safety is enforced by `typecheck` and `cdk synth`.

## Phase scope

This README and stack cover **Phase 0 only**: Epic 2.1 (CDK skeleton) and Epic 2.4
(this README). The Phase-0 stack provisions:

- Two private S3 buckets: `WebBucket` (SPA) and `AudioBucket` (generated audio)
- A CloudFront distribution fronting both buckets via Origin Access Control (OAC)
  - default behavior → `WebBucket`
  - `/audio/*` → `AudioBucket`
  - 403/404 → `/index.html` (SPA fallback)
- Three empty Secrets Manager secrets (values set out-of-band, see below)
- SSM parameters under `/open-contract/*` (runtime config / feature flags)
- A `BucketDeployment` that uploads the static placeholder page in `web-placeholder/`

The following are explicitly **out of scope** for Phase 0 and are added later:

- Epic 2.2 — API Gateway
- Epic 2.3 — Step Functions pipeline orchestration
- Epic 2.5 — pipeline Lambdas (`backend/src/handlers/` is Phase 3, imported then — not now)

## Prerequisites

- **Node 20+** and **pnpm 10.13.1**
- **AWS CLI v2**, authenticated (`aws sts get-caller-identity` should succeed)
- **CDK bootstrap** in the target account/region (one-time per account/region):

  ```sh
  pnpm --dir infrastructure exec cdk bootstrap aws://<ACCOUNT_ID>/<REGION>
  ```

- The `backend/` package must be installed and built first, because this project
  links it via `file:../backend`:

  ```sh
  pnpm --dir backend install && pnpm --dir backend build
  ```

## Install

```sh
pnpm --dir infrastructure install
```

## Commands

All commands are run from the repo root with `pnpm --dir infrastructure <script>`:

| Command                                | What it does                                              |
| -------------------------------------- | --------------------------------------------------------- |
| `pnpm --dir infrastructure typecheck`  | `tsc --noEmit` — offline type safety check                |
| `pnpm --dir infrastructure synth`      | `cdk synth` — render the CloudFormation template (offline gate) |
| `pnpm --dir infrastructure diff`       | `cdk diff` — diff deployed stack vs local (needs AWS creds) |
| `pnpm --dir infrastructure deploy`     | `cdk deploy` — deploy the stack (needs AWS creds + bootstrap) |
| `pnpm --dir infrastructure lint`       | ESLint over `bin/` and `lib/`                             |
| `pnpm --dir infrastructure format`     | Prettier write                                            |

`synth` requires no AWS credentials and is the Phase-0 offline acceptance gate.

## One-time out-of-band secret setup

The stack creates **empty** Secrets Manager secrets. After the first `deploy`, set
their values once (these are never committed and never set via CDK):

```sh
aws secretsmanager put-secret-value \
  --secret-id open-contract/MONGODB_URI \
  --secret-string '<your-mongodb-connection-string>'

aws secretsmanager put-secret-value \
  --secret-id open-contract/ANTHROPIC_API_KEY \
  --secret-string '<your-anthropic-api-key>'

aws secretsmanager put-secret-value \
  --secret-id open-contract/ELEVENLABS_API_KEY \
  --secret-string '<your-elevenlabs-api-key>'
```

Similarly, the placeholder SSM parameters that ship with a single-space value
(`/open-contract/ELEVENLABS_VOICE_ES`, `/open-contract/ELEVENLABS_VOICE_EN`,
`/open-contract/BRAND_TAGLINE`) should be given real values out-of-band, e.g.:

```sh
aws ssm put-parameter --overwrite \
  --name /open-contract/ELEVENLABS_VOICE_ES \
  --type String --value '<voice-id>'
```

> SSM rejects empty-string values at deploy time, which is why these parameters
> ship with a `' '` (single space) placeholder rather than `''`.

## Frontend deployment

There is **no `deploy:fe` script yet** — uploading the real built frontend to
`WebBucket` is implemented in **Area 10**. For now the distribution serves only
the static placeholder page in `web-placeholder/index.html`.
