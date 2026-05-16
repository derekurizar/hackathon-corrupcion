# Tech stack

frontend:
- Vite + React + TypeScript (static SPA → S3/CloudFront)
- Tailwind CSS + shadcn/ui
- Framer Motion (motion/animations)
- Recharts (charts), React Flow (buyer→supplier graph)
- React Router, i18next (bilingual ES/EN), TanStack Query

backend:
- Node 20 + TypeScript
- `@core` pure package: ingest, normalize, entity resolution, 23-rule
  detection engine, benchmarks, ranking/dedup, story orchestration
- Thin Lambda handlers (API + each Step Functions task)
- AWS Step Functions, EventBridge, API Gateway (HTTP API)
- Streaming JSON parse (stream-json / Big-JSON) for 100 MB+ OCDS files
- AWS CDK (single app, all infrastructure)

databases:
- MongoDB Atlas — collections: `curatedReleases`, `entities`, `benchmarks`,
  `signals`, `investigations`, `editions`, `pipelineRuns`
  (schema: `idea/06-data-model.md`)

thirds-parties:
- Anthropic Claude — evidence-constrained bilingual story generation
  (prompt caching on the stable system prefix)
- ElevenLabs — 60-second ES/EN podcast narration → S3
- Data source: Guatecompras OCDS — `https://ocds.guatecompras.gt/file/json/{YEAR}/{MONTH}`
  (month NOT zero-padded)
