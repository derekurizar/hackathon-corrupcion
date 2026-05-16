# 07 — Generation (clustering, story, audio, editions)

Spec refs: `../idea/04-story-and-podcast.md`, `../idea/06`, `../idea/00`
(guardrails), `../idea/05` (Scene contract). Phase 2.
Depends on: 03, 05, 06, 02 (audio S3 + secrets).

## Epic 7.1 — Rank & cluster
- [ ] Group `signals` by `caseKey = sha(buyer.id|family|scope)`; rank by
  review priority → aggregate confidence → total value → recency; select
  top-N (`MAX_INVESTIGATIONS_PER_RUN`).
  *Done:* deterministic ordering; N respected; unit-tested.

## Epic 7.2 — Claude story generation
- [ ] Prompt: cached system prefix (guardrails, journalist tone, banned
  phrases, anonymization rule, output schema, caveat) + per-case evidence
  block; model `claude-sonnet-4-6`; prompt caching.
  *Done:* returns the chapter-aligned ES/EN JSON + `podcast` + `scenePlan`
  per `../idea/04`.
- [ ] `scenePlan`: LLM picks `sceneId` from the shortlist (`06`) + params;
  run `validateScenePlan` → persist with `source`.
  *Done:* invalid LLM params demonstrably fall back to default scene.
- [ ] Guardrail post-checks: no banned phrase; every `keyFinding` maps to
  evidence; no personal name when `entityType=individual|unknown`.
  *Done:* a violation triggers exactly one retry, then deterministic
  evidence-only summary; never throws.

## Epic 7.3 — Dedup & persistence
- [ ] `evidenceHash`: skip unchanged; on change regenerate, `version+1`,
  overwrite canonical `investigations` doc (versioned audio keys).
  *Done:* re-run with identical evidence performs zero LLM/audio calls.
- [ ] Compute anonymized `supplier.displayName{Es,En}` + `isIndividual`
  from `entities.entityType`; raw names never enter `investigations`.
  *Done:* individual case shows "un proveedor individual"/"an individual
  supplier"; company shows verbatim name.

## Epic 7.4 — Podcast audio
- [ ] `GenerateAudio`: ElevenLabs `eleven_multilingual_v2`, separate
  `ELEVENLABS_VOICE_ES/EN`, 60s scripts → S3 `audio/{caseKey}/{version}/
  {es|en}.mp3`; persist `podcastCuePoints` (approximate).
  *Done:* both tracks play via CloudFront; skipped if `{caseKey,version}`
  exists.

## Epic 7.5 — Editions & dashboard stats
- [ ] On publish: create an **Edition** (run seq/timestamp, leadCaseKey,
  highlights, stats); recompute the single `dashboardStats` doc.
  *Done:* `/editions/current` + `/stats` reflect the run; counts correct
  after a re-run (no double count).
- [ ] Stage toggles (`runStory/runAudio/runPublish`) honored.
  *Done:* each toggle independently short-circuits its stage.
