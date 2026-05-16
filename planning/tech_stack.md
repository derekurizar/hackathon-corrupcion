# Tech stack

frontend:
- Vite + React + TypeScript (static SPA → S3/CloudFront)
- Tailwind CSS + shadcn/ui
- Framer Motion (motion/animations)
- Recharts (charts), React Flow (buyer-centric relationship graph)
- React Router (routes: `/`, `/newsroom`, `/investigation/:caseKey`,
  `/methodology`), i18next (bilingual ES/EN), TanStack Query
- **Investigative-noir design system** + cinematic chaptered Article
  (fixed spine, deterministic SceneResolver + scene library, 3 nav modes:
  scroll / presentation / podcast-approx). Ref `assets/ui_idea.png`.
  Spec: `idea/05-frontend.md`

backend:
- Node 20 + TypeScript
- `@core` pure package: ingest, normalize, entity resolution, 23-rule
  detection engine + default RuleConfig, benchmarks, ranking/dedup, story
  orchestration
- Thin Lambda handlers (API + each Step Functions task)
- Local CLI runner (`/scripts`) for the dev loop (no LocalStack/SAM)
- AWS Step Functions, EventBridge (enabled monthly, safe-day cron),
  API Gateway (HTTP API, public read-only + throttling)
- `yauzl` (streaming unzip of the monthly ZIP in `/tmp`) + `stream-json`
  (streaming JSON parse of 100 MB+ OCDS)
- AWS CDK (single app, all infrastructure **except the external Atlas**)

databases:
- MongoDB Atlas — **external / pre-existing; NOT provisioned by CDK**.
  Collections: `curatedReleases`, `entities`, `benchmarks`, `signals`,
  `investigations`, `editions`, `dashboardStats`, `pipelineRuns`.
  Authoritative collections/indexes spec: `idea/06-data-model.md`.
  Money stored as `Number` (float64).

thirds-parties:
- Anthropic Claude — `claude-sonnet-4-6`, evidence-constrained bilingual story
  generation, journalist tone, individual-supplier anonymization, prompt
  caching on the stable system prefix
- ElevenLabs — `eleven_multilingual_v2`, 60s ES/EN podcast narration with
  **separate native voices** (`ELEVENLABS_VOICE_ES/EN`) → S3
- Data source: Guatecompras OCDS — `https://ocds.guatecompras.gt/file/json/{YEAR}/{MONTH}`
  (month NOT zero-padded; returns a ZIP)
