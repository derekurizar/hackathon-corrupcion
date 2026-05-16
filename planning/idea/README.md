# Idea Spec Set — Expediente Público / Open Contract Newsroom

> **One-liner:** A system that turns ~1 year of Guatemala's public procurement
> data (Guatecompras / OCDS) into explainable investigative stories — detecting
> unusual patterns with deterministic rules, narrating them with Claude, and
> presenting interactive bilingual articles with motion design and 60-second
> podcast narration.

This folder is the **polished, decomposed product spec** for the hackathon
build. It supersedes (condenses) `../assets/open_contract_newsroom_idea.md`.
It is the input for task planning in `../tasks/`.

> ⚠️ The system **does not prove corruption**. It surfaces *review signals* —
> contracts and patterns worth investigating. See `00-product.md` guardrails.

## Files

| File | Purpose |
|---|---|
| [`00-product.md`](./00-product.md) | Vision, positioning, ethical guardrails, brand, users |
| [`01-architecture.md`](./01-architecture.md) | AWS-native architecture (S3/CloudFront, API GW/Lambda, Step Functions, Atlas, CDK) |
| [`02-data-ingestion.md`](./02-data-ingestion.md) | Source, streaming per-month ingest, normalization, entity resolution, idempotency |
| [`03-detection-rules.md`](./03-detection-rules.md) | Pluggable rule engine + full **23-rule catalog** + review-priority model |
| [`04-story-and-podcast.md`](./04-story-and-podcast.md) | Claude story gen, ElevenLabs podcast, dedup (caseKey), Editions |
| [`05-frontend.md`](./05-frontend.md) | 3 views (Dashboard, Newsroom, Article), bilingual, motion |
| [`06-data-model.md`](./06-data-model.md) | MongoDB Atlas collections, shapes, indexes |
| [`07-pipeline.md`](./07-pipeline.md) | Step Functions state machine, stage toggles, API surface |
| [`08-scope-and-demo.md`](./08-scope-and-demo.md) | 48h build sequencing, core/stretch, demo script, risks |

Source-of-truth references (do **not** re-derive):
- `../assets/guatecompras_observed_types.ts` — shared OCDS input types (reuse verbatim)
- `../assets/guatecompras_schema_report.md` — field presence %, value sets, counts
- `../assets/open_contract_newsroom_idea.md` — original brief

## Locked decisions

| Area | Decision |
|---|---|
| Constraints | Solo, 48h |
| Data | ~1 year of Guatecompras OCDS, curated into MongoDB Atlas |
| Ingestion source | `https://ocds.guatecompras.gt/file/json/{YEAR}/{MONTH}` — **month NOT zero-padded** (`/2026/4`) |
| Ingestion shape | Month-parameterized (`{year,month}`), run repeatedly, **idempotent upserts** |
| Pipeline stage toggles | Secrets/SSM flags (`runBenchmarks/runDetection/runStory/runAudio/runPublish`, `INGEST_ONLY`) |
| Detection | Deterministic **pluggable rule engine** → `ContractSignal` w/ evidence; LLM only narrates |
| Rules in scope | **All 4 families, 23 rules** |
| Hero signal | **Supplier concentration** headlines the polished article |
| Risk display | **Review Priority (High/Med/Low) + signal list**. No numeric score shown to users. |
| Story LLM | **Claude (Anthropic)**, evidence-constrained, bilingual ES + EN |
| Podcast | **ElevenLabs**, 60s summary, ES + EN, batch pre-generated, stored in S3 |
| Generation strategy | Batch pre-generate top-N; `MAX_INVESTIGATIONS_PER_RUN` (default ~20) in SSM as cost guard |
| "Newspaper" concept | An **Edition** bundles a run's investigations; Newsroom feed = latest edition |
| Views | **3**: Dashboard · Newsroom feed · Investigation Article (podcast embedded) |
| Hero article | **Full anatomy** (hero+counter, timeline, buyer→supplier graph, price chart, signal cards, evidence panel, podcast, methodology) |
| Dedup model | **caseKey = hash(primaryEntityId + signalFamily + timeWindow)** → one canonical article per case |
| Language | **Fully bilingual** ES/EN (UI, stories, podcast) |
| Frontend | **Vite + React SPA** + Tailwind + shadcn/ui + Framer Motion + Recharts + React Flow |
| Hosting FE | S3 + CloudFront |
| API | API Gateway + Lambda |
| DB | MongoDB Atlas |
| Pipeline | EventBridge schedule → **Step Functions** |
| IaC | **Single AWS CDK app** for everything |
| Build approach | **AWS-native first**; core logic as testable TS modules wrapped by thin Lambda handlers |
| Dashboard angle | National "**procurement radar**" + statistics |
| Geo features | **Stretch only** — capture `region` in model, no map UI in MVP |
| Product name | **Configurable** (single brand config / i18n key). Working title *Expediente Público* / *Open Contract Newsroom* |

## Brand name — configurable

The product name is **not final**. It lives as a single config value
(`BRAND.name`, `BRAND.tagline`) plus i18n keys, so it can be swapped in one
place. Working title: **Expediente Público** (ES) / **Open Contract Newsroom**
(EN). Do not hardcode the name in components, prompts, or audio scripts —
always read from config/i18n.
