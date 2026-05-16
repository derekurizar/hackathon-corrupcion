import { getCollection } from '../db/collections.js';
import type { Benchmark } from '../schema/index.js';

export async function getBenchmarkByScope(scopeId: string): Promise<Benchmark | null> {
  const col = await getCollection('benchmarks');
  return col.findOne({ _id: scopeId } as never) as Promise<Benchmark | null>;
}

export async function upsertBenchmark(doc: Benchmark): Promise<void> {
  const col = await getCollection('benchmarks');
  await col.replaceOne({ _id: doc._id } as never, doc as never, { upsert: true });
}
