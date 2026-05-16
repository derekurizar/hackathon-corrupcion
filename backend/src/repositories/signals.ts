import { getCollection } from '../db/collections.js';
import type { Signal } from '../schema/index.js';

export async function insertSignals(docs: Signal[]): Promise<void> {
  if (docs.length === 0) return;
  const col = await getCollection('signals');
  await col.insertMany(docs as never[], { ordered: false });
}

export async function getSignalsByCaseKey(caseKey: string): Promise<Signal[]> {
  const col = await getCollection('signals');
  return col.find({ caseKey } as never).toArray() as Promise<Signal[]>;
}

export async function getSignalsByOcid(ocid: string): Promise<Signal[]> {
  const col = await getCollection('signals');
  return col.find({ ocid } as never).toArray() as Promise<Signal[]>;
}

/**
 * Deletes every signal for a scope (Area 05 idempotent re-run). The scope is
 * persisted on `Signal.timeWindow` (the scope label, e.g.
 * `scope:2026-04..2026-04`). Followed by a bulk re-insert by `runDetection`,
 * so a re-run over an unchanged corpus yields identical signal counts.
 */
export async function deleteSignalsByScope(scope: string): Promise<void> {
  const col = await getCollection('signals');
  await col.deleteMany({ timeWindow: scope } as never);
}
