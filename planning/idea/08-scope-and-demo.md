# 08 — Scope, 48h Sequencing & Demo

Solo, 48h, AWS-native. Strategy: **thin vertical slice first** (one real
investigation end-to-end), then breadth. Never let the demo depend on a live
pipeline run — everything is pre-generated and stored.

**Dev-loop:** for each stage, build & verify the `@core` logic via the local
CLI runner against the **real (pre-existing) Atlas**, then wrap it as a
Lambda/Step Functions task. Fast iteration, AWS-native target preserved.

## Where the polish goes

Judging rewards **civic impact + storytelling + design/UX wow**. Bias the 48h
budget to: narrative quality, the `/methodology` "signals not proof" framing,
the bilingual podcast, accessible copy, AND motion polish (animated hero,
relationship graph, dashboard visuals). **Technical breadth is secondary** —
the 4 core rules + a few high-signal ones are enough; **"all 23 rules" is a
stretch**, and saved time is reinvested into polish.

## Build sequencing

1. **Skeleton** — single CDK app: S3 (web/audio), CloudFront, API Gateway +
   one Lambda; `@core` connects to the existing Atlas via `MONGODB_URI`
   secret (**Atlas not provisioned by CDK**). Vite SPA "hello" deployed.
2. **Ingest** — `IngestMonth` (zip→/tmp→yauzl→stream, drop docs/attributes),
   guarded keep-latest upsert to `curatedReleases` + `entities`. Verify a few
   months; full ~12 months is the target (bulk `INGEST_ONLY`), thin slice
   only as a fallback.
3. **4 core rules** — `single_bidder` (1), `direct_award_overreliance` (3),
   `price_outlier_vs_category` (13), `supplier_concentration_per_buyer` (7).
   Plus `BuildBenchmarks`. Produce real `signals`.
4. **One hero case** — `RankAndCluster` → `caseKey` (buyer|F2|scope);
   `GenerateStory` (Claude Sonnet 4.6, ES+EN, anonymized) for the top
   supplier-concentration case; `Publish` → `investigations` + Edition +
   `dashboardStats`.
5. **Article UI** — the adaptive full-anatomy Investigation Article rendering
   the hero (hero+counter, timeline w/ honest missing markers, buyer-centric
   React Flow graph, Recharts price, signal cards, evidence panel, fixed
   4-section body, methodology footer). **Centerpiece — polish here.**
6. **Newsroom + Dashboard** — feed = all investigations + Edition banner +
   filters; Dashboard radar from `dashboardStats` (94.5% stat, counters,
   distributions). `/methodology` page.
7. **Bilingual + podcast** — i18n wired; `GenerateAudio` (ElevenLabs 60s,
   separate native ES/EN voices); embedded player; language toggle switches
   text + audio.
8. **Remaining rules** — fill out the rest of the 23 (engine is pluggable).
   *(Stretch — only if polish budget allows.)*
9. **Widen ingestion** — confirm full ~12-month load (`INGEST_ONLY` bulk),
   one full processing pass; richer feed + bigger radar numbers.
10. **Polish** — motion, copy, guardrail check, demo dry-run.

**MVP floor (guaranteed deliverable):** stop after step 7 — one polished
bilingual supplier-concentration investigation end-to-end + Dashboard radar +
60s podcast, deployed. Everything after is upside.

## Core vs stretch

**Core (must ship):** ingest (target ~12 months), ≥4 rules, hero
supplier-concentration investigation (ES/EN + podcast), full-anatomy adaptive
Article, Newsroom feed + featured Edition, Dashboard radar, `/methodology`
page, dedup, AWS-native deploy.

**Stretch:** all 23 rules; geo/region map UI; past-editions browsing;
multi-case "digest" articles; `GET /entities/{id}` & `GET /editions/{id}`;
Opus 4.7 for the hero only; on-demand generation.

## Demo script (~3 min)

1. **Dashboard** (landing) — animated counters; the punchline chart:
   **≈94.5% of procurement is direct purchase**; signals-by-family; priority
   distribution.
2. **Newsroom** — featured Edition banner; scan the cards; apply a filter
   (e.g. F2 / high priority).
3. **Hero Investigation Article** — open the supplier-concentration story:
   animated value counter, timeline (with honest "no public data" markers),
   buyer→supplier React Flow graph, price comparison, signal cards. Scroll to
   the **Evidence panel** — each claim traces to exact OCDS fields +
   benchmark. Emphasize: *signals, not proof*; show `/methodology`.
4. **Podcast** — press "Listen": 60-second ES narration (native voice). Toggle
   to **EN** — UI + story + audio all switch. Close on the caveat footer.

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| AWS infra eats time (solo, 48h) | One CDK app; **Atlas external/pre-existing (not in IaC)**; public SRV + open allowlist + strong creds (no VPC/NAT); thin handlers over testable `@core`; local CLI runner |
| 100 MB+ zip blows Lambda limits | Per-month fan-out; zip→/tmp→yauzl→stream; drop docs/attributes (`02`); compressed download helps the budget |
| Live pipeline fails on stage | Everything pre-generated & stored; demo reads DB/S3 only; EventBridge cron on a safe day so it can't fire mid-demo |
| LLM hallucination / accusation / name leak | Evidence-constrained prompt + banned-phrase + evidence-mapping + individual-name post-checks; retry once → deterministic fallback (`04`) |
| Sparse data for some rules | Hero relies on full-scope concentration; single-month-capable rules (1,5,15,17,20,21,22) cover the thin slice |
| Cost (Claude/ElevenLabs) | `MAX_INVESTIGATIONS_PER_RUN` guard + Map concurrency 3 + prompt caching + `evidenceHash` skip |
| Bilingual doubles content | Single Claude call returns ES+EN+scripts; pre-rendered, not on-demand |

## Definition of done (demo-ready)

Hero supplier-concentration investigation visible end-to-end (Dashboard →
Newsroom → Article → ES/EN podcast), deployed on the CloudFront URL, all
content pre-generated, individual-anonymization + guardrail caveat present in
text and audio.
