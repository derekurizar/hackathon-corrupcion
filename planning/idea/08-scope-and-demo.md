# 08 — Scope & Build Phases

We are building a **good product**, not optimizing for a demo. The
authoritative, dependency-ordered build order lives in
`../tasks/00-sequence.md` (Phases 0–4) with per-area task files. This file
gives the scope frame, the product risks, and a **non-driving** demo
walkthrough kept only as a reference.

Constraints remain real (solo build, AWS-native), but they are expressed as
**product increments**, not a demo target.

**Dev-loop:** for each `@core` stage, build & verify via the local CLI runner
against the **real (pre-existing) Atlas**, then wrap it as a Lambda /
Step Functions task. Fast iteration, AWS-native target preserved.

## Where the effort goes

Quality bar emphasizes **civic impact + storytelling + design/UX wow**:
narrative quality, the `/methodology` "signals not proof" framing, the
bilingual podcast, accessible copy, and motion polish (animated hero,
relationship graph, dashboard visuals). Rule **breadth** is depth, not the
gate — the core rules carry the product; the rest is Phase 4.

## First usable product increment (end of Phase 3)

The product is usable (the increment that matters — **not** a demo) when, from
real ingested data:

- ingestion → benchmarks → detection → generation has run for ≥ several
  months;
- the SPA serves the **Dashboard** (radar from `dashboardStats`), the
  **Newsroom** (all current investigations + current Edition), and the
  **cinematic Article** with the **7 core scenes** in Scroll mode, fully
  bilingual with the 60s podcast;
- every article claim is evidence-traceable; individual suppliers anonymized;
  the caveat is present in text + audio;
- it is deployed (S3/CloudFront + API + external Atlas) and reproducible via
  the `@core` CLI and (Phase 4) the Step Functions pipeline.

See `../tasks/00-sequence.md` for the full phase/exit criteria.

## Core vs depth

**Core (Phases 0–3 — the usable product):** workspace+infra+`@core`+data
model, the **scene contract**, ingest (≥ several months), benchmarks +
detection (≥ the high-signal rules), generation (bilingual + podcast + dedup +
Editions + `dashboardStats`), API, the cinematic chaptered Article with the
**7 core scenes** + `ScenePicker` + default fallback + Scroll & Presentation
modes, Newsroom + Dashboard + `/methodology`, AWS-native deploy.

**Depth (Phase 4):** full ~12-month ingest; all 23 rules; the **7 high-value
scene variants** (`CaseSplit`, `PriceBars`, `ThresholdLadder`,
`SplittingCluster`, `RepeatBidders`, `EvidenceCompare`, `GapSpotlight`);
Step Functions pipeline + EventBridge; a11y/perf; observability;
podcast-mode auto-advance refinement.

**Stretch:** `RegionMap`/geo scene; past-editions browsing; multi-case
"digest" articles; `GET /entities/{id}` & `GET /editions/{id}`; Opus 4.7 for
the lead investigation only; on-demand generation.

## Product risks & mitigations

| Risk | Mitigation |
|---|---|
| AWS infra time sink | One CDK app; **Atlas external/pre-existing (not in IaC)**; public SRV + open allowlist + strong creds (no VPC/NAT); thin handlers over testable `@core`; local CLI runner |
| 100 MB+ zip vs Lambda limits | Per-month fan-out; zip→/tmp→yauzl→stream; drop docs/attributes (`02`); compressed download helps the budget |
| Pipeline failure | Everything pre-generated & stored; UI reads DB/S3 only; EventBridge on a safe-day cron; stages idempotent |
| LLM hallucination / accusation / name leak | Evidence-constrained prompt + banned-phrase + evidence-mapping + individual-name post-checks; retry once → deterministic fallback (`04`) |
| Sparse data for some rules | Concentration uses full-scope history; single-month-capable rules (1,5,15,17,20,21,22) still fire on a thin slice |
| Cost (Claude/ElevenLabs) | `MAX_INVESTIGATIONS_PER_RUN` guard + Map concurrency 3 + prompt caching + `evidenceHash` skip |
| Bilingual doubles content | Single Claude call returns ES+EN+scripts; pre-rendered, not on-demand |
| Cinematic UI / scene catalog scope | **Finite** Scene Catalog (no generative engine); 7 core scenes with a **guaranteed default per chapter**; 7 variants are Phase-4 depth; build Scroll → Presentation → Podcast |
| LLM picks a scene that misreads data | Rule-filtered shortlist + **evidence-binding validation** (`05` Scene contract); fail → deterministic default scene (`source:"fallback"`) |
| Animation jank | transform/opacity-only motion, `content-visibility`, code-split scenes, `prefers-reduced-motion` path |

## Appendix — demo walkthrough (non-driving reference)

Not a build driver; a way to *show* the finished product:

1. **Dashboard** — animated counters; the punchline chart: **≈94.5% of
   procurement is direct purchase**; signals-by-family; priority distribution.
2. **Newsroom** — featured Edition banner; filter (e.g. F2 / high priority).
3. **Cinematic Article** — Scroll mode: Cover (parallax + value count-up) →
   El Caso → Sigue el Dinero → Las Conexiones (graph builds in) → Evidencia
   (claims trace to exact OCDS fields + benchmark) → Cronología (honest "no
   public data" markers) → Cierre. Emphasize *signals, not proof*;
   `/methodology`.
4. **Presentation mode** — full-screen chapters, arrow-advance.
5. **Podcast mode** — "Escuchar": 60s native ES narration, approx chapter
   auto-advance; toggle **EN** (UI + story + audio switch); close on the
   Cierre caveat.
