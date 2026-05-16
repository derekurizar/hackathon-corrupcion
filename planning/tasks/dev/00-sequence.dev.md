# 00 — Master Execution Plan

Operationalizes [`../00-sequence.md`](../00-sequence.md). This is the
program-level plan: it does **not** build an area; it sets prerequisites, the
per-area dev-plan convention, phase gates, and progress tracking that every
`dev/NN-*.dev.md` follows.

Scope/acceptance lives in the specs (`../idea/NN`, `../00-sequence.md`); this
folder is **execution only**. No time estimates anywhere (hackathon cadence).

---

## 0. Repo structure decision (supersedes spec workspace assumptions)

This repo does **not** use a pnpm workspace. The spec/idea docs assume one
(`@core`/`@handlers`/`@scene-contract` packages, `pnpm -r`); per the project
owner's decision the structure is **four fully isolated standalone TS
projects**, each owned by its area:

| Folder | Role | Owner area |
|---|---|---|
| `backend/` | **Canonical** shared code: OCDS types, `CuratedRelease` schema, config, Mongo client, all stage logic, **thin Lambda handlers** (`src/handlers/`, type-only `aws-lambda`) | 01 bootstrap; 02 handlers; 03/04/05/07 |
| `data-integestion/` | Dev-loop **CLI runner**; 1st `file:../backend` consumer | 01 skeleton; 04 |
| `frontend/` | Vite + React SPA (API types **frontend-owned/zod-validated** — no sync; scene-contract = Area 06 synced copy) | 10 |
| `infrastructure/` | Single AWS CDK app; **2nd** `file:../backend` consumer (bundles handlers) | 02 (+ Area 09 adds the 5 API routes/Lambdas — additive; **+ Area 08 pipeline absorbed into 02**) |

> **Area 08 is merged into Area 02** (project-owner decision). There is **no
> `dev/08-pipeline.dev.md`**; `../08-pipeline.md` stays the source-of-truth
> spec (untouched) and is **fulfilled by `dev/02-infrastructure.dev.md`**
> (Epic 2.3 builds the pipeline CDK; Epic 2.5 absorbs Area 08's enablement +
> audio-S3 glue + resilience/toggle/e2e). Area 02 owns the full pipeline.

Consequences for this plan: no `@core`/`@scene-contract` alias (shared code =
the `backend` package via a local `file:` dep); no root `pnpm -r` — every
command is **per-folder** (`pnpm --dir <folder> …`); each area sets up only its
own folder against shared **root config files** (`tsconfig.base.json`,
`eslint.config.mjs`, `.prettierrc`, `.editorconfig`, `.gitignore`,
`.env.example`). `@scene-contract` → `backend/src/scene-contract/` (Area 06) — pure/
copy-portable; `frontend/` consumes a **hand-synced copy** (no `file:` dep,
drift risk; see `dev/06-scene-contract.dev.md`).
Where this doc says `@core` it means the `backend` package.

**Stage-fn naming convention (canonical, idea/07 verbatim).** The backend
pipeline stage functions are exported (via `backend/src/index.ts`) with these
exact names — kebab-case files, camelCase exports: `ingestMonth`,
`buildBenchmarks`, `runDetection`, `rankAndCluster`, `generateStory`,
`generateAudio`, `publish`. `generateAudio` is a **pure util only** (no
backend Step-Functions handler); the deployed `Map:GenerateAudio` task is the
infra glue `infrastructure/lambda/audio-glue.ts` (Area 02 Epic 2.5). The
`data-integestion` CLI keeps short ergonomic **verbs**
(`ingest|benchmarks|detect|generate|publish`) → fn mapping:
`ingest→ingestMonth`, `benchmarks→buildBenchmarks`, `detect→runDetection`,
`generate` chains `rankAndCluster→generateStory→generateAudio→publish`,
`publish→publish` (so §4 Phase-gate `cli …` commands are unchanged). **API
response types are frontend-owned zod (no sync); scene-contract is the only
hand-synced copy.**

---

## 1. How to use this folder

- **Spec vs. execution split:**
  - `planning/tasks/NN-*.md` — source-of-truth scope (Epics → *Done:*). Never
    edited by dev plans.
  - `planning/tasks/dev/NN-*.dev.md` — how to execute that area (steps, paths,
    commands, verify). What we author here.
- **Authoring order of the per-area dev plans** (follows the critical chain in
  `../00-sequence.md` line 122, one at a time):

  `00 → 01 → 02 → 03 → 06 → 04 → 05 → 07 → 09 → 10 → 11 → 12`
  *(Area 08 absorbed into Area 02 — no separate `08` dev plan; its scope is
  Epic 2.5 of `dev/02-infrastructure.dev.md`.)*

  Each is written only when its turn comes; do not pre-write downstream plans
  (spec may shift as upstream areas land).

---

## 2. Prerequisites & bootstrap (before Phase 0)

### Have (confirmed available)
- `MONGODB_URI` — external MongoDB Atlas (pre-provisioned; **never** created or
  managed by CDK).
- `ANTHROPIC_API_KEY` — Claude `claude-sonnet-4-6`.

### Acquire / do (blockers — see §7)
- **AWS account + `cdk bootstrap`** *(Phase 0 blocker)*: create/choose account,
  pin one region (dev/demo), `aws configure`, install AWS CDK CLI, then
  `cdk bootstrap aws://<acct>/<region>`.
- **ElevenLabs key + voices** *(Phase 2 blocker, acquire before Area 07)*:
  `ELEVENLABS_API_KEY`, plus `ELEVENLABS_VOICE_ES` and `ELEVENLABS_VOICE_EN`
  (separate native voices). Not needed for Phase 0–1.
- **Guatecompras source reachable**: confirm
  `https://ocds.guatecompras.gt/file/json/{YEAR}/{MONTH}` returns a ZIP
  (month **not** zero-padded). Verify once before Area 04.

### Local toolchain
- Node 20, `pnpm`, AWS CDK CLI.

### Secrets handling
- **Local dev loop** (`data-integestion` CLI over the `backend` package):
  `.env` only — `MONGODB_URI`, `ANTHROPIC_API_KEY` now; `ELEVENLABS_*` once
  acquired. Defined in Area 01.3.
- **Deployed Lambdas**: Secrets Manager + SSM, set out-of-band. Defined in
  Area 02.1. CDK consumes, never stores secret values.

### Prerequisites checklist (all green before Phase 0)
- [ ] `node -v` → v20.x ; `pnpm -v` OK
- [ ] `aws sts get-caller-identity` succeeds in the pinned region
- [ ] `cdk bootstrap` completed for `<acct>/<region>`
- [ ] `.env` has `MONGODB_URI`, `ANTHROPIC_API_KEY`; Atlas reachable from a
      one-off Node connect test
- [ ] Guatecompras month URL returns a ZIP (spot HEAD/GET)
- [ ] ElevenLabs key + ES/EN voice IDs recorded (may stay pending until Phase 2)

---

## 3. Per-area dev-plan template (the convention)

Every `dev/NN-*.dev.md` is authored with **exactly** this skeleton (lean;
steps reference real file paths + commands; *Verify* restates the spec's
*Done:* as a runnable check):

```markdown
# NN — <Area name> (dev plan)

Spec: ../NN-<area>.md | Idea refs: ../../idea/<...>.md
Phase: <0–4> | Depends on: <area #s> | Blocks: <area #s>
Prereqs: <from §2 of 00-sequence.dev.md that must be green>

## Epic N.M — <epic title>
Goal: <one line — the observable outcome>
Steps:
1. <create/edit `path/to/file` — what & why>
2. <command to run, e.g. `pnpm --dir backend test`>
3. ...
Verify: <copy the spec *Done:* line, then the exact command/observation
that proves it (test name, CLI output, deployed URL, Mongo query)>

## Epic N.M+1 — ...
```

Rules: one Epic block per spec Epic, same numbering; Steps are ordered and
each names a concrete artifact or command; Verify is runnable, not prose; no
estimates; link upstream dev plans for shared types/utilities instead of
re-describing them. **No workspace** (see §0): commands are per-folder
(`pnpm --dir <folder> …`); there is no `@core` alias — import shared code from
the `backend` package.

---

## 4. Phase gates

Entry precondition → the areas advanced → **exit gate as a runnable check**
(translated from `../00-sequence.md` exit criteria). A phase is "done" only
when its exit commands pass.

### Phase 0 — Foundation  (Areas 01, 02, 03, 06)
- Entry: §2 prerequisites checklist all green.
- Order: 01 → (02 ∥ 03) → 06 (06 needs 03 types).
- Exit:
  - [ ] per-folder `pnpm install && pnpm build` clean on stubs in `backend/`
        and `data-integestion/`; `pnpm --dir backend test`/`lint` clean
  - [ ] `cdk synth` + `cdk deploy` create the skeleton stack; placeholder
        `index.html` served over the CloudFront URL
  - [ ] `backend` connects to Atlas via the `data-integestion` CLI
        (memoized client; `cli ping` smoke green)
  - [ ] all **8 collections + indexes** created (`curatedReleases`, `entities`,
        `benchmarks`, `signals`, `investigations`, `editions`,
        `dashboardStats`, `pipelineRuns`) per `../../idea/06` —
        `pnpm --dir data-integestion cli ensure-indexes` runs twice clean and
        `getIndexes` shows the `../../idea/06` set
  - [ ] scene-contract validator unit-tested with fixtures (Zod param schemas,
        shortlist map, evidence-binding + `deriveFromEvidence` defaults) —
        `pnpm --dir backend test` scene-contract suite green + purity grep +
        standalone copy `tsc --noEmit`

### Phase 1 — Data path  (Areas 04, 05)
- Entry: Phase 0 exit green; Guatecompras URL verified.
- Order: 04 → 05 (05 reads `curatedReleases` + benchmarks).
- Exit:
  - [ ] ≥1 month ingested (ZIP→`/tmp`→`yauzl`→`stream-json`; keep-latest
        idempotent upsert by `ocid`; entity resolution + `entityType`) —
        `pnpm --dir data-integestion cli ingest --year <Y> --month <M>` then a
        re-ingest yields no dups (`getByOcid` shows latest) + entity docs
        present
  - [ ] benchmarks computed for the ingested scope —
        `pnpm --dir data-integestion cli benchmarks` writes a
        `scope:<min>..<max>` doc
  - [ ] signals written for the **full rule set** on real data —
        `pnpm --dir data-integestion cli detect` (all **23 rules** implemented
        in P1, untuned; Area 05 Epic 5.4 elevated from spec Phase 4 — see
        `dev/05-benchmarks-detection.dev.md`); re-run yields identical counts
  - [ ] spot-check a sample of signals vs `../../idea/03` by hand

### Phase 2 — Intelligence  (Area 07)
- Entry: Phase 1 exit green; **ElevenLabs key + ES/EN voices acquired**.
- Exit:
  - [ ] top-N investigations persisted with **valid `scenePlan`** (Area 06
        validator passes) — `pnpm --dir data-integestion cli generate
        --scope <min..max>` (rank→story→audio→publish)
  - [ ] bilingual ES/EN content; audio in S3 `audio` bucket; cue points
        (audio S3 write is **caller-owned** — `data-integestion` dev loop /
        infra deployed; `backend` stays AWS-SDK-free)
  - [ ] an `editions` doc + `dashboardStats` doc written
  - [ ] guardrail post-checks pass (no banned phrase; every `keyFinding` maps
        to evidence; individuals anonymized); fail → retry once → deterministic
        summary fallback
  - [ ] re-run is idempotent (unchanged `evidenceHash` → skipped)

### Phase 3 — Delivery  (Areas 09, 10, 11, 12)
- Entry: Phase 2 exit green.
- Order: 09 → 10 → (11 ∥ 12).
- Exit = **First usable product increment** (`../00-sequence.md` 103–116):
  - [ ] API serves `/stats`, `/investigations`(+filters),
        `/investigations/{caseKey}`, `/editions/current`, `/filters` —
        **5 per-route Lambdas/routes**; `curl https://<cf>/api/<endpoint>`
        per route returns the projected DTO (no `signalIds`/raw individual
        ids) after `cdk deploy`
  - [ ] SPA serves Dashboard (radar from `dashboardStats`), Newsroom (all
        current investigations + current Edition), and the cinematic Article
        with the **7 core scenes** in Scroll mode, fully bilingual + 60s podcast
        — foundation (Area 10): `pnpm --dir frontend build` +
        `pnpm --dir infrastructure run deploy:fe`; deep-link refresh resolves;
        ES/EN toggle works (views filled by Areas 11/12) — Area 11 P3 =
        Article shell + `ScenePicker` + 7 core scenes + Scroll + basic ES/EN
        audio; Presentation/Podcast-mode auto-advance + a11y/perf hardening =
        Area 11 **Phase 4**. Area 12 P3 = Dashboard/Newsroom/Methodology
        views; Epic 12.4 polish = **Phase 4**
  - [ ] every article claim is evidence-traceable; individual suppliers
        anonymized; caveat present in text **and** audio
  - [ ] deployed (S3/CloudFront + API + Atlas); reproducible via the
        `data-integestion` CLI

### Phase 4 — Hardening & depth  (Areas 04/05/06/08/11/12)
- Entry: Phase 3 exit green. Items independent/parallelizable.
- Exit:
  - [ ] full ~12-month ingest; all **23 rules** tuned on the full corpus
        (Area 05 rules already implemented in P1 — Phase 4 = **tuning only**)
  - [ ] 7 high-value scene variants; `RegionMap` (stretch) (+ Area 11
        Presentation mode & Podcast-mode auto-advance + a11y/perf hardening)
  - [ ] **Area 02 (Phase 4, absorbed Area 08 — Epic 2.5):** EventBridge
        monthly safe-day cron enabled + Step Functions wraps the proven
        `backend` stages; stage toggles; resilience (`MaxConcurrency 3`,
        429 backoff, partial-success); one end-to-end pipeline run
  - [ ] a11y (`prefers-reduced-motion`, keyboard) + perf budget (60fps,
        code-split scenes); observability; guardrail/e2e tests; copy pass
        (+ Area 12 Epic 12.4: empty/error/skeletons/responsive/reduced-motion)

---

## 5. Dependency chain → milestone map

`01 → 02/03 → 06 → 04 → 05 → 07 → 09 → 10 → 11/12 → (Phase 4 depth;
pipeline = Area 02 Epic 2.5, absorbed Area 08)`

| Milestone | Means | Parallelizable |
|---|---|---|
| M0 Skeleton | 01 done | — |
| M1 Infra + data model | 02 ∥ 03 done | 02 ∥ 03 after 01 |
| M2 Contracts | 06 done (needs 03 types) | — |
| M3 Data in Atlas | 04 → 05 done | sequential |
| M4 Intelligence | 07 done | — |
| M5 API | 09 done | — |
| M6 App shell | 10 done | — |
| M7 Usable product | 11 ∥ 12 done | 11 ∥ 12 after 10 |
| M8 Automated pipeline | Area 02 Epic 2.5 done (absorbed Area 08) | — |
| M9 Depth | Phase 4 items | all parallel after M7 |

---

## 6. Progress tracker

`dev plan` = is `dev/NN-*.dev.md` authored. `build` = area implemented & its
phase-gate checks pass.

| Area | Phase | Dev plan | Build |
|---|---|---|---|
| 00 sequence (this) | — | ✅ | n/a |
| 01 workspace-tooling | 0 | ✅ | ⬜ |
| 02 infrastructure (+ pipeline, absorbed 08) | 0/3/4 | ✅ | ⬜ |
| 03 core-data-model | 0 | ✅ | ⬜ |
| 06 scene-contract | 0/4 | ✅ | ⬜ |
| 04 ingestion | 1 | ✅ | ⬜ |
| 05 benchmarks-detection | 1/4 | ✅ | ⬜ |
| 07 generation | 2 | ✅ | ⬜ |
| 09 api | 3 | ✅ | ⬜ |
| 10 frontend-foundation | 3 | ✅ | ⬜ |
| 11 frontend-article | 3/4 | ✅ | ⬜ |
| 12 frontend-views | 3/4 | ✅ | ⬜ |
| 08 pipeline → merged into Area 02 | 4 | ✅ (in 02 Epic 2.5) | ⬜ |

---

## 7. Program risk register

| Risk | Mitigation |
|---|---|
| **AWS not yet bootstrapped** — Phase 0 blocker | Do §2 bootstrap before any P0 work; gate P0 entry on the checklist |
| **ElevenLabs key/voices not yet acquired** — Phase 2 blocker | Acquire before Area 07; Phases 0–1 unaffected; gate P2 entry |
| 100 MB+ monthly ZIP vs Lambda 15 min / 10 GB | ZIP→`/tmp`→`yauzl`→`stream-json`; drop `tender.documents[]` / `items.attributes[]`; single per-month streaming Lambda; spike ZIP structure first (Area 04) |
| Atlas reachability from Lambda (no VPC/NAT) | Public SRV URI + allowlist `0.0.0.0/0` + strong creds + TLS; verify with a test Lambda in P0 |
| External-API rate limits / cost blow-up | `MAX_INVESTIGATIONS_PER_RUN` cap (SSM); Map concurrency 3 + 429 backoff; `evidenceHash` skip avoids regen |
| Guardrail / anonymization failure | Evidence-constrained prompt + banned-phrase + evidence-map post-checks; retry once → deterministic evidence-only summary; never blocks pipeline |
