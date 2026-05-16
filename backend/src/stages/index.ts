export { ensureIndexesStage } from './ensure-indexes.js';
export { ingestMonth } from './ingest-month.js';
export type { IngestMonthArgs, IngestMonthResult } from './ingest-month.js';

export async function buildBenchmarks(..._args: unknown[]): Promise<never> {
  console.log('[stage] buildBenchmarks');
  throw new Error('not implemented — Area 05');
}

export async function runDetection(..._args: unknown[]): Promise<never> {
  console.log('[stage] runDetection');
  throw new Error('not implemented — Area 05');
}

export async function rankAndCluster(..._args: unknown[]): Promise<never> {
  console.log('[stage] rankAndCluster');
  throw new Error('not implemented — Area 07');
}

export async function generateStory(..._args: unknown[]): Promise<never> {
  console.log('[stage] generateStory');
  throw new Error('not implemented — Area 07');
}

export async function generateAudio(..._args: unknown[]): Promise<never> {
  console.log('[stage] generateAudio');
  throw new Error('not implemented — Area 07');
}

export async function publish(..._args: unknown[]): Promise<never> {
  console.log('[stage] publish');
  throw new Error('not implemented — Area 07');
}
