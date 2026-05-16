# 07 — Generation (dev plan)

Spec: [`../07-generation.md`](../07-generation.md) | Idea refs:
`../../idea/04-story-and-podcast.md` (authoritative),
`../../idea/06-data-model.md`, `../../idea/00-product.md` (guardrails),
`../../idea/05-frontend.md` (scene contract)
Phase: 2 | Depends on: 03, 05, 06, 02 | Blocks: 09 (API), 08 (pipeline)
Prereqs (`00-sequence.dev.md` §2): Phase 1 exit green (signals on real data);
`ANTHROPIC_API_KEY`; **ElevenLabs key + `ELEVENLABS_VOICE_ES/EN` acquired
(Phase-2 blocker)**; Atlas; the `audio` S3 bucket deployed (Area 02) for the
S3-write verify.

## Boundary & reuse

- All logic in **`backend/`** (stages replace the Area 01 `generate` stub);
  the `data-integestion` `generate` CLI routes to them.
- **`generateAudio` is a pure util** (defined in
  `backend/src/generation/audio.ts`, re-exported via `backend/src/index.ts`):
  ElevenLabs over HTTPS `fetch` (allowed — only `@aws-sdk`/`aws-sdk` is
  banned in `backend`), **returns `{ key, bytes, contentType }[]` + cue
  points**, no S3, no exists check. It is **NOT a Step-Functions stage/
  handler**. The **caller owns S3 write + skip-if-`{caseKey,version}`-
  exists**: the `data-integestion` CLI adapter (dev loop, may import
  `@aws-sdk/client-s3` — it is *not* `backend`) for Phase-2; the **Area 02
  Epic 2.5 infra glue Lambda** `infrastructure/lambda/audio-glue.ts` for the
  deployed `Map:GenerateAudio` task. `backend` stays AWS-SDK-free (purity
  grep unchanged). The shared `audioKey(caseKey,version,lang)` (same module,
  re-exported via `backend/src/index.ts`) is used by both callers so they
  don't re-derive keys.
- **Canonical stage-fn names** (idea/07 verbatim, kebab files / camelCase
  exports): `rankAndCluster`, `generateStory`, `publish` are the
  Step-Functions stage fns; `generateAudio` is the pure util above.
- **Reuse, never re-implement:** Area 03 `caseKey`/`evidenceHash` (locked
  normalization), pipeline-runs writer, `Investigation/Edition/DashboardStats`
  schemas (Area 03 left `es`/`en`/`scenePlan` permissive — **Area 07 fills
  that content**); Area 05 `reviewPriority` + signal shape; Area 06
  `shortlist`/`validateScenePlan`/`deriveFromEvidence`/`refs`/`SCENES`
  (`import … from 'backend'`).
- **Additive** to Area 03 repos (no Area 03 rework): `investigations.
  getByCaseKey`, `investigations.upsert` (evidenceHash-guard + version bump),
  `editions.insert`. Reuse `dashboardStats.upsertCurrent` as defined.
- Banned-phrase list **content sourced from `idea/00-product.md`** at
  execution. The Anthropic client is built via the **`claude-api` skill**
  (prompt caching, model, structured output, 429 backoff).

---

## Epic 7.1 — Rank & cluster  (Phase 2)

Goal: deterministic top-N case bundles from `signals`.

Steps:
1. `backend/src/generation/rank.ts` `rankAndCluster({scope})`: group `signals`
   by `caseKey` (Area 03 identity); per case compute `reviewPriority`
   (Area 05), aggregate confidence, total value, recency; sort
   `reviewPriority → aggConfidence → totalValue → recency`; take top-N =
   `loadConfig().MAX_INVESTIGATIONS_PER_RUN`. Return ordered bundles
   `{ caseKey, buyer, family, scope, signals[], evidence[], entities, firedRuleIds }`.
2. `backend/src/stages/rank-and-cluster.ts` thin stage wrapper.

Verify: spec *Done* "deterministic ordering; N respected; unit-tested" →
`backend/src/generation/rank.test.ts` (fixed signal set → fixed order;
`MAX_INVESTIGATIONS_PER_RUN` cap respected; tie-break stable).

## Epic 7.2 — Claude story generation  (Phase 2)

Goal: cached-prefix bilingual chapter JSON + podcast + validated `scenePlan`,
guardrail-safe.

Steps:
1. `backend/src/generation/prompt.ts`: stable **cached system prefix**
   (journalist voice + `idea/00` guardrails + banned-phrase list +
   anonymization rule + output JSON schema + mandatory caveat) marked
   `cache_control`; per-case **evidence-only** user block (signals; evidence
   field/value/benchmark/comparison; entities w/ `entityType` hint; values;
   scope; "use only facts present here").
2. `backend/src/generation/claude.ts` (build via the **`claude-api` skill**):
   `@anthropic-ai/sdk`, model `claude-sonnet-4-6` (off-by-default `OPUS_LEAD`
   toggle → `claude-opus-4-7` for the single lead only), prompt caching,
   429/backoff; returns bilingual `es`/`en` chapter keys + `keyFindings` +
   `podcast.{es,en}.{script,cuePoints}` + per-chapter `scenePlan
   {sceneId,params}`.
3. `backend/src/generation/scene-plan.ts`: per chapter, restrict the LLM
   `sceneId` to Area 06 `shortlist(chapter, firedRuleIds, {hasBenchmark,
   hasRegion})`; run `validateScenePlan(chapter, entry, signals, evidence,
   investigation)` (Area 06) → persist the returned entry with its `source`.
4. `backend/src/generation/guardrails.ts`: post-checks — no banned phrase;
   every `keyFinding` maps to an evidence item; no personal name when
   `entityType ∈ {individual,unknown}`. Violation → **exactly one retry**
   (stricter instruction); still failing → **deterministic evidence-only
   summary** (no LLM) + `scenePlan` via Area 06 `deriveFromEvidence`
   (`source:'fallback'`). **Never throws.**

Verify:
- spec *Done* "returns the chapter-aligned ES/EN JSON + `podcast` +
  `scenePlan` per idea/04" → env-gated integration on one real case asserts
  the shape.
- spec *Done* "invalid LLM params demonstrably fall back to default scene" →
  `scene-plan.test.ts` feeds bad/unbound params → entry `source:'fallback'`,
  sceneId = chapter default.
- spec *Done* "a violation triggers exactly one retry, then deterministic
  evidence-only summary; never throws" → `guardrails.test.ts` with a stubbed
  Claude returning a banned phrase → one retry attempt, then fallback summary,
  no throw.

## Epic 7.3 — Dedup & persistence  (Phase 2)

Goal: evidenceHash-guarded versioned upsert + publish-time anonymization.

Steps:
1. Additive Area 03 `investigations` repo: `getByCaseKey(caseKey)` and
   `upsert(doc)` guarded by Area 03 `evidenceHash(signals)` (reused verbatim):
   absent → insert `version:1`; **same hash → skip** (no LLM/audio); changed
   → regenerate, `version+1`, overwrite the canonical doc (versioned audio
   keys via `audioKey`).
2. `backend/src/generation/anonymize.ts`: compute `supplier.displayName{Es,
   En}` + `isIndividual` from `entities.entityType` (Area 03/04 rule); raw
   names **never** written to `investigations`; `individual|unknown` → "un
   proveedor individual"/"an individual supplier"; `company` → verbatim name.

Verify:
- spec *Done* "re-run with identical evidence performs zero LLM/audio calls" →
  integration: run twice; the second logs `skipped` (hash match) with the
  Claude/ElevenLabs clients asserted not called.
- spec *Done* "individual case shows … ; company shows verbatim name" →
  `anonymize.test.ts` over company/individual/unknown.

## Epic 7.4 — Podcast audio  (Phase 2)

Goal: pure ElevenLabs synthesis returning bytes; caller persists to S3.

Steps:
1. `backend/src/generation/audio.ts`:
   `audioKey(caseKey,version,lang)='audio/<caseKey>/<version>/<lang>.mp3'`;
   `generateAudio({caseKey,version,podcast,voices})` → ElevenLabs
   `eleven_multilingual_v2` (HTTPS `fetch`) per `ELEVENLABS_VOICE_ES/EN`;
   **returns** `[{ key, bytes, contentType:'audio/mpeg' }]` (es+en) +
   `podcastCuePoints` (approx per-chapter `tSec`). No S3, no exists check.
2. `data-integestion` S3 audio adapter (`@aws-sdk/client-s3`, allowed outside
   `backend`): for each returned item, `HeadObject` → **skip if exists**, else
   `PutObject`. Wire it into the `generate` CLI after `generateAudio`.
   (Deployed caller = Area 02/08 infra Lambda glue — cross-ref, not built
   here.)

Verify: spec *Done* "both tracks play via CloudFront; skipped if
`{caseKey,version}` exists" → CLI run uploads `es.mp3`/`en.mp3`; GET via the
CloudFront `/audio/*` URL → 200 `audio/mpeg`; a re-run logs `skipped` and the
ElevenLabs client is asserted not called.

## Epic 7.5 — Editions & dashboard stats  (Phase 2)

Goal: publish writes an Edition + recomputes the single `dashboardStats`;
toggles honored.

Steps:
1. Additive Area 03 `editions` repo `insert(doc)` (Area 03 defined only
   `getCurrent`). `backend/src/generation/publish.ts` `publish({runId,scope})`:
   write `Edition` (`_id`=run-seq/timestamp, `publishedAt`, `leadCaseKey`,
   `highlightCaseKeys`, `stats{count,totalValueFlagged,byFamily}`);
   **recompute** the single `dashboardStats` (`_id:"current"` — counters/
   methodBreakdown/byFamily/priorityDist/trend/topBuyers per idea/06) **from
   the collections** (not incremented → no double count) via
   `dashboardStats.upsertCurrent`.
2. `backend/src/stages/{rank-and-cluster,generate-story,publish}.ts` + the
   pure `backend/src/generation/audio.ts` (`generateAudio`/`audioKey`) + a
   `backend/src/stages/generate.ts` orchestrator (rank→story→audio→publish,
   for the CLI dev loop) honoring `RUN_STORY`/`RUN_AUDIO`/`RUN_PUBLISH` via
   `loadConfig()`; `pipelineRuns` counts (Area 03 writer). Replace the Area 01
   stubs (canonical names `rankAndCluster`/`generateStory`/`publish`); export
   them from `backend/src/index.ts` for **Area 02 Step-Functions tasks
   `RankAndCluster`/`Map:GenerateStory`/`Publish`**. **`generateAudio` is a
   pure util only — NOT a Step-Functions stage/handler**: the deployed
   `Map:GenerateAudio` task is the infra glue (Area 02 Epic 2.5); the CLI
   dev-loop audio S3 write is the `data-integestion` adapter (Epic 7.4). The
   `data-integestion` `generate` CLI verb chains all four.

Verify:
- spec *Done* "`/editions/current` + `/stats` reflect the run; counts correct
  after a re-run (no double count)" → integration: run → inspect
  `editions`/`dashboardStats`; re-run → identical counts.
- spec *Done* "each toggle independently short-circuits its stage" →
  toggle-matrix test (`RUN_STORY`/`RUN_AUDIO`/`RUN_PUBLISH` each off).

---

## Files created (at execution)

`backend/src/generation/`: `rank.ts`, `prompt.ts`, `claude.ts`,
`scene-plan.ts`, `guardrails.ts`, `anonymize.ts`, `audio.ts`
(`generateAudio`/`audioKey` — pure util, **not** a SFN stage), `publish.ts`,
`editions.ts` + tests. `backend/src/stages/`: `rank-and-cluster.ts`
(`rankAndCluster`), `generate-story.ts` (`generateStory`), `publish.ts`
(`publish`), `generate.ts` (CLI orchestrator) — replace the Area 01 stubs.
**No `generate-audio.ts` stage** (audio = infra glue, Area 02 Epic 2.5). Additive Area 03 repo fns in
`backend/src/repositories/{investigations,editions}.ts`. `data-integestion/`:
S3 audio adapter + `generate` CLI wiring. Edits: `backend/src/index.ts`
(export stage fns + `audioKey`), `backend/package.json` (`@anthropic-ai/sdk`),
`data-integestion/package.json` (`@aws-sdk/client-s3`).

## Decisions locked

- All in `backend/`; **canonical** stage fns `rankAndCluster`/`generateStory`/
  `publish` (Step-Functions stages, exported via `backend/src/index.ts` for
  Area 02 Epic 2.5) + the pure util `generateAudio`/`audioKey`
  (`backend/src/generation/audio.ts`, **not** a SFN handler) + a `generate`
  orchestrator (CLI dev loop) replace the Area 01 stubs; CLI verb chains them
  honoring `RUN_STORY/RUN_AUDIO/RUN_PUBLISH`.
- `generateAudio` pure → bytes+keys+cue points; **caller owns S3 +
  exists-skip** (`data-integestion` dev loop / infra deployed); shared
  `audioKey()`; `backend` AWS-SDK-free.
- Model `claude-sonnet-4-6` (+ off-by-default `OPUS_LEAD`→`claude-opus-4-7`
  for the lead); prompt caching on the stable system prefix; Anthropic client
  built via the **`claude-api` skill** at execution.
- Reuse Area 03 `caseKey`/`evidenceHash`/pipeline-runs/schemas, Area 05
  `reviewPriority`, Area 06 `shortlist`/`validateScenePlan`/
  `deriveFromEvidence`/`refs` (import from `backend`).
- Additive Area 03 repo fns: `investigations.getByCaseKey`+`upsert`
  (evidenceHash-guard, version bump), `editions.insert`; reuse
  `dashboardStats.upsertCurrent`.
- Guardrails: banned list from `idea/00-product.md`; violation → one retry →
  deterministic evidence-only summary + `deriveFromEvidence` scenePlan; never
  throws. Anonymization at publish from `entities.entityType`; raw names never
  in `investigations`.
- Dedup: same `evidenceHash` → skip (zero LLM/audio); changed → version+1
  overwrite. `dashboardStats` recomputed from collections (no double count);
  Edition `_id` = run-seq.

## Risks

- **Idempotency split** (user-accepted): skip-if-exists is duplicated per
  caller (`data-integestion` + infra) — mitigated by shared `audioKey()` + a
  documented contract; Area 08 must mirror the dev-loop caller's skip logic.
- **ElevenLabs Phase-2 blocker**: key + ES/EN voices required (00 §2) before
  Epic 7.4 verifies; 7.1–7.3/7.5 testable without it (stubbed clients).
- **Deployed S3 write = Area 02/08**: Phase-2 "audio in S3" verified via the
  `data-integestion` caller against the real bucket; Lambda glue
  cross-referenced, not built here.
- **`evidenceHash` consistency**: reuse the Area 03 helper verbatim (don't
  re-derive) — a test asserts the import path; dedup correctness depends on it.
- **Atlas/keys/data-dependent Verifies** need Phase 1 signals + ANTHROPIC +
  ElevenLabs + deployed audio bucket; offline coverage = rank/guardrails/
  scene-plan/anonymize unit tests with stubbed Claude/ElevenLabs.

## Verification (end-to-end runbook)

```
# offline (stubbed Claude/ElevenLabs)
pnpm --dir backend install && pnpm --dir backend build         # 0 exit
pnpm --dir backend test                                        # rank +
                                                               # scene-plan +
                                                               # guardrails +
                                                               # anonymize +
                                                               # editions
grep -rE "@aws-sdk|'aws-sdk'" backend/src                      # no matches
# Phase 2 (Atlas + ANTHROPIC + ElevenLabs + deployed audio bucket)
pnpm --dir data-integestion cli generate --scope <min..max>    # rank→story→
                                                               # audio→publish
#  → top-N investigations w/ valid scenePlan (Area 06 validator),
#    bilingual es/en, audio/<caseKey>/<v>/{es,en}.mp3 in S3,
#    editions + dashboardStats docs written
curl -I https://<cf>/audio/<caseKey>/1/es.mp3                   # 200 audio/mpeg
pnpm --dir data-integestion cli generate --scope <min..max>    # re-run:
                                                               # evidenceHash
                                                               # skip, 0 calls
RUN_INTEGRATION=1 pnpm --dir backend test                      # zero-call
                                                               # re-run +
                                                               # no-double-count
```
All green ⇒ Area 07 satisfies its spec *Done:* criteria and delivers the
Phase 2 exit gate (`00-sequence.dev.md` §4): top-N investigations w/ valid
`scenePlan`, bilingual + audio, Edition + `dashboardStats`, guardrail
retry→fallback, idempotent re-run.
