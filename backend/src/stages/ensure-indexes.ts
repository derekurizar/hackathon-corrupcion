import { ensureIndexes } from '../db/ensure-indexes.js';

export async function ensureIndexesStage(): Promise<void> {
  await ensureIndexes();
}
