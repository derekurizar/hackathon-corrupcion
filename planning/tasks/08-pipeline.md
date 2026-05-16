# 08 — Pipeline Orchestration

Spec refs: `../idea/07-pipeline.md`, `../idea/01`. Phase 4 (after `@core`
stages proven locally + via CLI).
Depends on: 04, 05, 07, 02 (Step Functions/EventBridge infra).

## Epic 8.1 — State machine
- [ ] `ResolveMonths` → `Map: IngestMonth` (standard `Map`, bounded
  concurrency) → `BuildBenchmarks` → `RunDetection` → `RankAndCluster` →
  `Map: GenerateStory` → `Map: GenerateAudio` → `Publish`.
  *Done:* an end-to-end execution on 1–2 months produces investigations +
  Edition + `dashboardStats`.
- [ ] Each task = thin Lambda wrapping the proven `@core` function.
  *Done:* no business logic in handlers; parity with CLI output.

## Epic 8.2 — Stage toggles
- [ ] Choice states read SSM: `INGEST_ONLY`, `runBenchmarks/Detection/Story/
  Audio/Publish`.
  *Done:* bulk workflow works: many `INGEST_ONLY` runs, then one full pass.

## Epic 8.3 — Resilience
- [ ] Ingest `Map`: retry/backoff + `Catch`→failure collector (one bad month
  doesn't abort).
  *Done:* a poisoned month is skipped; later stages run on present data.
- [ ] Story/Audio `Map`: `MaxConcurrency: 3` + exponential backoff on 429;
  per-item failure logged to `pipelineRuns.errors`, others continue.
  *Done:* simulated 429s recover; partial success persists.
- [ ] Idempotency end-to-end (guarded upsert + `evidenceHash` + audio-key
  skip).
  *Done:* re-running the whole machine changes nothing when evidence is
  unchanged.

## Epic 8.4 — Schedule
- [ ] EventBridge monthly, **safe-day cron**, enabled; manual start accepts
  `{year,month,flags}`.
  *Done:* scheduled rule visible & enabled; manual start documented; cron
  cannot collide with a live session.
