import { getCollection } from '../db/collections.js';
import type { PipelineRun } from '../schema/index.js';

export async function startRun(opts: {
  months: Array<{ year: number; month: number }>;
  toggles: Record<string, boolean>;
}): Promise<string> {
  const runId = `run-${new Date().toISOString()}`;
  const doc: PipelineRun = {
    _id: runId,
    startedAt: new Date().toISOString(),
    monthsRequested: opts.months,
    toggles: opts.toggles,
    stages: {
      ingest: 'pending',
      benchmarks: 'pending',
      detection: 'pending',
      story: 'pending',
      audio: 'pending',
      publish: 'pending',
    },
    counts: { recordsIngested: 0, signals: 0, investigations: 0 },
    errors: [],
  };
  const col = await getCollection('pipelineRuns');
  await col.insertOne(doc as never);
  return runId;
}

export async function markStage(
  runId: string,
  stage: string,
  status: string,
): Promise<void> {
  const col = await getCollection('pipelineRuns');
  await col.updateOne(
    { _id: runId } as never,
    { $set: { [`stages.${stage}`]: status } } as never,
  );
}

export async function setCounts(
  runId: string,
  counts: PipelineRun['counts'],
): Promise<void> {
  const col = await getCollection('pipelineRuns');
  await col.updateOne({ _id: runId } as never, { $set: { counts } } as never);
}

export async function appendError(runId: string, err: unknown): Promise<void> {
  const col = await getCollection('pipelineRuns');
  await col.updateOne({ _id: runId } as never, { $push: { errors: err } } as never);
}

export async function finishRun(runId: string): Promise<void> {
  const col = await getCollection('pipelineRuns');
  await col.updateOne(
    { _id: runId } as never,
    { $set: { finishedAt: new Date().toISOString() } } as never,
  );
}
