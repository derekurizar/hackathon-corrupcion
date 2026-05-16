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
