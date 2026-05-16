# 08 — Scope, 48h Sequencing & Demo

Solo, 48h, AWS-native. Strategy: **thin vertical slice first** (one real
investigation end-to-end), then breadth. Never let the demo depend on a live
pipeline run — everything is pre-generated and stored.

## Build sequencing

1. **Skeleton** — single CDK app: S3 (web/audio), CloudFront, API Gateway +
   one Lambda, Atlas connection from `@core`. Vite SPA "hello" deployed.
2. **Ingest 1–2 months** — `IngestMonth` Lambda: stream, curate (drop
   docs/attributes), idempotent upsert to `curatedReleases` + `entities`.
   Verify counts.
3. **4 core rules** — `single_bidder` (1), `direct_award_overreliance` (3),
   `price_outlier_vs_category` (13), `supplier_concentration_per_buyer` (7).
   Plus `BuildBenchmarks`. Produce real `signals`.
4. **One hero case** — `RankAndCluster` → caseKey; `GenerateStory` (Claude,
   ES+EN) for the top supplier-concentration case; `Publish` →
   `investigations` + Edition.
5. **Article UI** — full-anatomy Investigation Article rendering the hero case
   (hero+counter, timeline, React Flow graph, Recharts price, signal cards,
   evidence panel, methodology). This is the centerpiece — polish here.
6. **Newsroom + Dashboard** — feed from latest Edition + filters; Dashboard
   radar (method-mix 94.5% stat, counters, distributions).
7. **Bilingual + podcast** — i18n wired; `GenerateAudio` (ElevenLabs 60s
   ES/EN); embedded player; language toggle switches text + audio.
8. **Remaining rules** — fill out the rest of the 23 (engine is pluggable).
9. **Widen ingestion** — bulk-load up to ~12 months (`INGEST_ONLY`), one full
   processing pass; richer feed + bigger radar numbers.
10. **Polish** — motion, copy, guardrail check, demo dry-run.

If time runs short, stop after step 7: a single polished bilingual
investigation with podcast + dashboard is a complete, compelling demo.

## Core vs stretch

**Core (must ship):** ingest (1–12 months), ≥4 rules, hero
supplier-concentration investigation (ES/EN + podcast), full-anatomy Article,
Newsroom feed, Dashboard radar, dedup/Editions, AWS-native deploy.

**Stretch:** all 23 rules; full 12-month load; geo/region map UI;
multi-case "digest" articles; `GET /entities/{id}` drill-down; past-editions
browsing; on-demand generation.

## Demo script (~3 min)

1. **Dashboard** — open on the radar: animated counters (X records, Q-value
   scanned, N months), then the punchline chart: **≈94.5% of procurement is
   direct purchase**, signals-by-family, priority distribution.
2. **Newsroom** — latest Edition; scan the cards; apply a filter (e.g. F2 /
   high priority).
3. **Hero Investigation Article** — open the supplier-concentration story:
   animated value counter, timeline, buyer→supplier React Flow graph, price
   comparison, signal cards. Scroll to the **Evidence panel** — show each
   claim tracing to exact OCDS fields + benchmark. Emphasize: *signals, not
   proof.*
4. **Podcast** — press "Listen": 60-second ES narration. Toggle to **EN** —
   UI + story + audio all switch. Close on the methodology/caveat footer.

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| AWS infra eats time (solo, 48h) | One CDK app; Atlas public SRV + IP allowlist (no VPC/NAT); thin handlers over testable `@core`; local invoke for iteration |
| 100 MB+ file blows Lambda limits | Per-month fan-out + streaming parse + drop docs/attributes (`02`) |
| Live pipeline fails on stage | Everything pre-generated & stored; demo reads DB/S3 only |
| LLM hallucination / accusation | Evidence-constrained prompt + banned-phrase check + deterministic fallback (`04`) |
| Sparse data for some rules | Hero relies on multi-month concentration; single-month rules (1,5,15,17,20,21,22) cover the thin slice |
| Cost (Claude/ElevenLabs) | `MAX_INVESTIGATIONS_PER_RUN` guard + prompt caching + `evidenceHash` skip |
| Bilingual doubles content | Single Claude call returns ES+EN+scripts; pre-rendered, not on-demand |

## Definition of done (demo-ready)

Hero supplier-concentration investigation visible end-to-end (Dashboard →
Newsroom → Article → ES/EN podcast), deployed on the CloudFront URL, all
content pre-generated, guardrail caveat present in text and audio.
