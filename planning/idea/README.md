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
> contracts and patterns worth investigating. Natural-person suppliers are
> anonymized. See `00-product.md` guardrails.

## Files

| File | Purpose |
|---|---|
| [`00-product.md`](./00-product.md) | Vision, positioning, ethical guardrails, individual anonymization, brand, users |
| [`01-architecture.md`](./01-architecture.md) | AWS-native architecture (S3/CloudFront, API GW/Lambda, Step Functions, external Atlas, CDK) |
| [`02-data-ingestion.md`](./02-data-ingestion.md) | ZIP source, /tmp+yauzl streaming, normalization, entity resolution, keep-latest idempotency |
| [`03-detection-rules.md`](./03-detection-rules.md) | Pluggable rule engine + 23-rule catalog + **default RuleConfig** + review-priority |
| [`04-story-and-podcast.md`](./04-story-and-podcast.md) | Claude Sonnet 4.6 story gen, LLM anonymization, ElevenLabs, dedup, Editions |
| [`05-frontend.md`](./05-frontend.md) | 4 routes (Dashboard, Newsroom, Article, Methodology), bilingual, motion |
| [`06-data-model.md`](./06-data-model.md) | MongoDB Atlas collections & indexes (authoritative; cluster is external) |
| [`07-pipeline.md`](./07-pipeline.md) | Step Functions state machine, stage toggles, API surface |
| [`08-scope-and-demo.md`](./08-scope-and-demo.md) | 48h sequencing, where polish goes, demo script, risks |

Source-of-truth references (do **not** re-derive):
- `../assets/guatecompras_observed_types.ts` — shared OCDS input types (reuse verbatim)
- `../assets/guatecompras_schema_report.md` — field presence %, value sets, counts
- `../assets/open_contract_newsroom_idea.md` — original brief

## Locked decisions

| Area | Decision |
|---|---|
| Constraints | Solo, 48h |
| Data | ~1 year of Guatecompras OCDS; demo target = **full ~12 months** pre-loaded |
| Ingestion source | `https://ocds.guatecompras.gt/file/json/{YEAR}/{MONTH}` — **month NOT zero-padded**; returns a **ZIP** |
| Ingestion runtime | Single per-month Lambda: zip→`/tmp`→`yauzl`→`stream-json`, drop docs/attributes; **no cache** |
| Idempotency | Guarded **keep-latest** upsert by `ocid` (incoming date ≥ stored) |
| Pipeline stage toggles | SSM flags (`runBenchmarks/runDetection/runStory/runAudio/runPublish`, `INGEST_ONLY`) |
| Detection | Deterministic **pluggable rule engine** → `ContractSignal` w/ evidence; LLM only narrates |
| Rules in scope | 4 families, 23 rules; **default RuleConfig shipped** w/ LCE bands Q90k/Q900k. Beyond 4 core = stretch |
| Case identity | `caseKey = sha(buyer.id | family | scope)` — **buyer-centric**, one per (buyer, family, scope) |
| Window | **Single full ingested scope** (label e.g. `2025-08..2026-07`) |
| UNSPSC | 4-digit **family** + hierarchical fallback (segment → mainCategory); award→category = most-frequent family |
| Hero signal | **Supplier concentration** (rule 7) headlines the polished article |
| Risk display | **Review Priority (High/Med/Low) + signal list**. No numeric score |
| Story LLM | **Claude Sonnet 4.6** (`claude-sonnet-4-6`), evidence-constrained, journalist tone, ES + EN, prompt caching |
| Individual suppliers | **Anonymized at the LLM layer** ("an individual supplier"); raw names internal only |
| Guardrail fail | Retry once → deterministic evidence-only summary (never blocks) |
| Podcast | ElevenLabs `eleven_multilingual_v2`, 60s, **separate native ES & EN voices**, pre-generated → S3 |
| Generation strategy | Batch pre-generate top-N; `MAX_INVESTIGATIONS_PER_RUN` (default ~20) SSM cost guard |
| Editions | **Featured "issue" per publish-run**; Newsroom feed = **all current** investigations |
| Story template | Fixed 4 sections (What we found / Why flagged / The evidence / What it does & doesn't mean) + caveat |
| Views / routes | `/` Dashboard (landing) · `/newsroom` · `/investigation/:caseKey` · `/methodology` |
| Article | **One adaptive component**, sections degrade gracefully; single buyer-centric React Flow graph |
| Timeline | Core, with honest "no public data" markers for missing stages |
| Language | **Fully bilingual** ES/EN (UI, stories, podcast) |
| Frontend | **Vite + React SPA** + Tailwind + shadcn/ui + Framer Motion + Recharts + React Flow + i18next |
| Hosting FE | S3 + CloudFront |
| API | API Gateway + Lambda — **public read-only + throttling/usage plan** |
| `/stats` | Reads a **precomputed `dashboardStats` snapshot** (written by Publish) |
| DB | **MongoDB Atlas — external/pre-existing; NOT provisioned by CDK** (collections/indexes in `06`) |
| Money | `Number` (float64), rounded to cents on read |
| Pipeline | EventBridge **enabled monthly (safe-day cron)** → Step Functions; standard `Map`; story/audio `Map` concurrency 3 + 429 backoff |
| IaC | **Single AWS CDK app** (everything except the external Atlas) |
| Atlas networking | Public SRV + allowlist `0.0.0.0/0` + strong creds + TLS; **no VPC/NAT** |
| Build approach | **AWS-native first**; `@core` testable modules + local CLI runner (no LocalStack/SAM); local-per-stage then wrap |
| Dashboard angle | National "**procurement radar**" + statistics |
| Geo features | **Stretch only** — `region` captured in model, no map UI |
| Judging emphasis | **Civic impact + storytelling + design/UX wow** (technical breadth secondary) |
| MVP floor | **Hero + Dashboard + Podcast** (stop after sequencing step 7), deployed |
| Product name | **Configurable** (single brand config / i18n). Working title *Expediente Público* / *Open Contract Newsroom* |

## Brand name — configurable

The product name is **not final**. It lives as a single config value
(`BRAND.name`, `BRAND.tagline`) plus i18n keys, so it can be swapped in one
place. Working title: **Expediente Público** (ES) / **Open Contract Newsroom**
(EN). Do not hardcode the name in components, prompts, or audio scripts —
always read from config/i18n.
