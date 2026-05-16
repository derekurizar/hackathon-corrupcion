import { loadConfig } from '../config/env.js';
import { downloadMonth } from '../ingest/fetch.js';
import { streamRecords } from '../ingest/stream.js';
import { withRetry } from '../ingest/retry.js';
import { toCuratedRelease } from '../ingest/normalize.js';
import { extractEntities } from '../ingest/entities.js';
import { upsertCuratedRelease } from '../repositories/curated-releases.js';
import { upsertEntity } from '../repositories/entities.js';
import {
  startRun,
  markStage,
  setCounts,
  appendError,
  finishRun,
} from '../repositories/pipeline-runs.js';

export interface IngestMonthArgs {
  year: number;
  month: number;
  /** Stream + normalize + count only; no download retry budget change, but
   * NO DB writes (no run doc, no upserts). */
  dryRun?: boolean;
}

export interface IngestMonthResult {
  recordsIngested: number;
  /** Present only on a real (non-dry) run. */
  runId?: string;
}

/**
 * Phase-1 ingest stage (replaces the Area 01 throwing stub; same exported
 * symbol `ingestMonth` consumed by the CLI verb and the Lambda handler).
 *
 * Flow: `loadConfig()` → `startRun` → `withRetry(downloadMonth)` →
 * `streamRecords` → per record `toCuratedRelease` + guarded keep-latest
 * `upsertCuratedRelease` (by `ocid` via `shouldReplace`) and `extractEntities`
 * → `upsertEntity` (merge, never clobber `rollup`) → `setCounts` /
 * `markStage('ingest','done')` / `finishRun`.
 *
 * Idempotency is delegated to Area 03's guarded upsert — re-ingesting any
 * month in any order keeps the latest `compiledRelease.date` and never
 * duplicates by `ocid`.
 *
 * `INGEST_ONLY`: this stage is ingest-only by definition; the flag means the
 * pipeline/CLI stops after this stage (no benchmarks/detection invoked) — it
 * does not change behavior here.
 *
 * `dryRun`: streams + normalizes + counts (proves bounded-memory parse) but
 * performs NO DB writes (no run doc, no upserts).
 */
export async function ingestMonth(
  args: IngestMonthArgs,
): Promise<IngestMonthResult> {
  const { year, month, dryRun = false } = args;
  const config = loadConfig();

  if (dryRun) {
    const zipPath = await withRetry(() => downloadMonth(year, month));
    let recordsIngested = 0;
    for await (const record of streamRecords(zipPath)) {
      // Normalize (validates the schema) but do not persist.
      toCuratedRelease(record, { year, month });
      extractEntities(record);
      recordsIngested++;
    }
    return { recordsIngested };
  }

  const toggles: Record<string, boolean> = {
    benchmarks: config.RUN_BENCHMARKS,
    detection: config.RUN_DETECTION,
    story: config.RUN_STORY,
    audio: config.RUN_AUDIO,
    publish: config.RUN_PUBLISH,
    ingestOnly: config.INGEST_ONLY,
  };

  const runId = await startRun({ months: [{ year, month }], toggles });
  await markStage(runId, 'ingest', 'running');

  let recordsIngested = 0;
  try {
    const zipPath = await withRetry(() => downloadMonth(year, month));
    for await (const record of streamRecords(zipPath)) {
      const curated = toCuratedRelease(record, { year, month });
      await upsertCuratedRelease(curated);
      for (const entity of extractEntities(record)) {
        await upsertEntity(entity);
      }
      recordsIngested++;
    }
  } catch (err) {
    await appendError(runId, {
      stage: 'ingest',
      month: { year, month },
      recordsIngested,
      message: err instanceof Error ? err.message : String(err),
    });
    await markStage(runId, 'ingest', 'failed');
    await setCounts(runId, {
      recordsIngested,
      signals: 0,
      investigations: 0,
    });
    await finishRun(runId);
    throw err;
  }

  await setCounts(runId, { recordsIngested, signals: 0, investigations: 0 });
  await markStage(runId, 'ingest', 'done');
  await finishRun(runId);
  return { recordsIngested, runId };
}
