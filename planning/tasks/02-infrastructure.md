# 02 — Infrastructure (single AWS CDK app)

Spec refs: `../idea/01-architecture.md`, `../idea/07-pipeline.md`,
`../idea/platform` (`../platform.md`). Phases 0 (skeleton) + 4 (pipeline).
**Atlas is external — CDK never provisions or manages it.**

## Epic 2.1 — CDK app skeleton (Phase 0)
- [ ] Single CDK app in `infrastructure/`; one env (dev/demo); region pinned.
  *Done:* `cdk synth` succeeds; `cdk deploy` creates the empty stack.
- [ ] S3 buckets: `web` (SPA), `audio` (podcasts). **No `raw-cache`.**
  *Done:* buckets exist; `audio` readable via CloudFront only.
- [ ] CloudFront: default→`web` (SPA fallback to `index.html`), `/audio/*`→
  `audio`, `/api/*`→API Gateway origin.
  *Done:* a placeholder `index.html` served over the CF URL.
- [ ] Secrets Manager + SSM params: `MONGODB_URI`, `ANTHROPIC_API_KEY`,
  `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ES/EN`,
  `MAX_INVESTIGATIONS_PER_RUN`, stage toggles, `BRAND_*`.
  *Done:* params resolvable by a test Lambda; values set out-of-band.

## Epic 2.2 — API surface wiring (Phase 3 enable)
- [ ] API Gateway HTTP API + Lambda integration; **throttling / usage plan**.
  *Done:* a health route returns 200 through CloudFront `/api/*`; rate limit
  configured.
- [ ] CORS not required (same origin via CF) — verify.
  *Done:* SPA fetch to `/api/*` works with no CORS error.

## Epic 2.3 — Step Functions + EventBridge (Phase 4)
- [ ] State machine definition (standard `Map`, Choice gates on SSM toggles)
  per `../idea/07`.
  *Done:* `cdk synth` includes the state machine; manual start input
  `{year,month,flags}` validates.
- [ ] EventBridge monthly rule, **safe-day cron (e.g. day 2 06:00)**,
  enabled.
  *Done:* rule present & enabled; target = state machine; cron documented.
- [ ] Lambda roles: least-priv to Secrets/SSM, S3 `audio`, egress to Atlas/
  Anthropic/ElevenLabs.
  *Done:* each task Lambda runs with no AccessDenied in an end-to-end run.

## Epic 2.4 — Deploy ergonomics
- [ ] `pnpm deploy:fe` builds the SPA and syncs to `web` + CF invalidation.
  *Done:* a content change is live after the command.
- [ ] Document the one-time manual secret-setting steps in the area README
  header.
  *Done:* a fresh operator can deploy following the steps.
