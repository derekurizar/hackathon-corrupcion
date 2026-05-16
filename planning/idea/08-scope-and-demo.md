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
5. **Cinematic Article (THE core WOW)** — build the noir design system +
   the **chapter spine** (Cover · El Caso · Sigue el Dinero · Las Conexiones ·
   Evidencia · Cronología · Cierre), the **7 core Scene-Catalog scenes**
   (one default per chapter — guarantees it always renders), the
   `ScenePicker` (renders `scenePlan`, falls back to default), and **Scroll
   mode**. Render the hero case end-to-end. **Pour the polish budget here.**
   Then **Presentation mode**, then **Podcast mode** (approx cue-point
   auto-advance), in that priority.
6. **Newsroom + Dashboard** — restyled to the same noir system with lighter
   motion: feed = all investigations as dossier cards + Edition banner +
   filters; Dashboard "war room" radar from `dashboardStats` (94.5% stat,
   counters, distributions); `/methodology` page.
7. **Bilingual + podcast** — i18n wired; `GenerateAudio` (ElevenLabs 60s,
   separate native ES/EN voices); transport-bar player; language toggle
   switches text + audio (+ cue points).
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
supplier-concentration investigation (ES/EN + podcast), the **cinematic
chaptered Article** with the design system + the **7 core Scene-Catalog
scenes** + `ScenePicker` + default fallback + **Scroll & Presentation
modes**, Newsroom + Dashboard restyled, `/methodology` page, dedup,
AWS-native deploy.

**In scope after core (7 high-value scene variants):** `CaseSplit`,
`PriceBars`, `ThresholdLadder`, `SplittingCluster`, `RepeatBidders`,
`EvidenceCompare`, `GapSpotlight`.

**Stretch:** `RegionMap`/geo scene; Podcast-mode chapter auto-advance
refinement; all 23 rules; past-editions browsing; multi-case "digest"
articles; `GET /entities/{id}` & `GET /editions/{id}`; Opus 4.7 for the hero
only; on-demand generation.

## Demo script (~3 min)

1. **Dashboard** (landing) — animated counters; the punchline chart:
   **≈94.5% of procurement is direct purchase**; signals-by-family; priority
   distribution.
2. **Newsroom** — featured Edition banner; scan the cards; apply a filter
   (e.g. F2 / high priority).
3. **Cinematic Investigation Article** — open the hero. **Scroll mode**:
   cover (parallax + value count-up) → El Caso → Sigue el Dinero → Las
   Conexiones (graph builds in) → Evidencia (claims trace to exact OCDS
   fields + benchmark) → Cronología (honest "no public data" markers) →
   Cierre. Emphasize *signals, not proof*; show `/methodology`.
4. **Presentation mode** — toggle: full-screen cinematic chapters, advance
   with arrows. The "wow" reveal.
5. **Podcast mode** — "Escuchar": 60s ES narration (native voice), chapters
   auto-advance on approximate cue points. Toggle to **EN** — UI + story +
   audio + cue points all switch. Close on the Cierre caveat.

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
| Cinematic UI / scene catalog scope (solo 48h) | **Finite** Scene Catalog (no generative engine); 7 core scenes = MVP with a **guaranteed default per chapter** so the Article always renders; 7 variants after core; geo scene + podcast-sync refinement = stretch; build Scroll → Presentation → Podcast |
| LLM picks a scene that misreads data | Rule-filtered shortlist bounds choices + **evidence-binding param validation** rejects any number/label not traceable to a signal; on fail → deterministic default scene (`source:"fallback"`) |
| Animation jank in live demo | transform/opacity-only motion, `content-visibility`, code-split scenes, `prefers-reduced-motion` path; rehearse on the demo machine |

## Definition of done (demo-ready)

Hero supplier-concentration investigation visible end-to-end (Dashboard →
Newsroom → Article → ES/EN podcast), deployed on the CloudFront URL, all
content pre-generated, individual-anonymization + guardrail caveat present in
text and audio.
