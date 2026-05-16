import type { WithId } from 'mongodb';
import { getCollection } from '../db/collections.js';
import type { Investigation } from '../schema/index.js';

export interface InvestigationFilters {
  family?: string;
  priority?: string;
  buyer?: string;
  minValue?: number;
  maxValue?: number;
  q?: string;
  page?: number;
}

export async function listInvestigations(
  filters: InvestigationFilters = {},
): Promise<Investigation[]> {
  const col = await getCollection('investigations');
  const query: Record<string, unknown> = {};
  if (filters.family) query['signalFamily'] = filters.family;
  if (filters.priority) query['reviewPriority'] = filters.priority;
  if (filters.buyer) query['buyer.id'] = filters.buyer;
  if (filters.minValue !== undefined || filters.maxValue !== undefined) {
    const range: Record<string, number> = {};
    if (filters.minValue !== undefined) range['$gte'] = filters.minValue;
    if (filters.maxValue !== undefined) range['$lte'] = filters.maxValue;
    query['totalValue'] = range;
  }
  const page = filters.page ?? 0;
  return col
    .find(query as never)
    .sort({ reviewPriority: 1, updatedAt: -1 })
    .skip(page * 20)
    .limit(20)
    .toArray() as Promise<Investigation[]>;
}

export async function getInvestigationByCaseKey(
  caseKey: string,
): Promise<WithId<Investigation> | null> {
  const col = await getCollection('investigations');
  return col.findOne({ _id: caseKey } as never) as Promise<WithId<Investigation> | null>;
}

export async function textSearchInvestigations(q: string): Promise<Investigation[]> {
  const col = await getCollection('investigations');
  return col
    .find({ $text: { $search: q } } as never)
    .limit(20)
    .toArray() as Promise<Investigation[]>;
}

export async function getDistinctFilterValues(): Promise<{
  families: string[];
  priorities: string[];
  buyers: Array<{ id: string; name: string }>;
}> {
  const col = await getCollection('investigations');
  const [families, priorities, buyerGroups] = await Promise.all([
    col.distinct('signalFamily'),
    col.distinct('reviewPriority'),
    col
      .aggregate([
        { $group: { _id: '$buyer.id', name: { $first: '$buyer.name' } } },
        { $sort: { _id: 1 } },
      ])
      .toArray(),
  ]);
  const buyers = buyerGroups.map((g) => ({
    id: g['_id'] as string,
    name: g['name'] as string,
  }));
  return {
    families: families as string[],
    priorities: priorities as string[],
    buyers,
  };
}

export async function upsertInvestigation(doc: Investigation): Promise<void> {
  const col = await getCollection('investigations');
  await col.replaceOne({ _id: doc._id } as never, doc as never, { upsert: true });
}
