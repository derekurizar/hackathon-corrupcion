import type { WithId } from 'mongodb';
import { getCollection } from '../db/collections.js';
import { moduleLogger } from '../obs/logger.js';
import type { Investigation } from '../schema/index.js';

const log = moduleLogger('repo/investigations');

/** Public list page size (Area 09 API). */
export const INVESTIGATIONS_PAGE_SIZE = 24;

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

/**
 * Area 09 public list. All filters AND-combined in one aggregation; results
 * ordered high→low review priority, then most-recent, then largest value.
 * `$facet` returns the page + the unpaged total in a single round trip.
 */
export async function listInvestigationsPaged(params: {
  family?: string;
  priority?: string;
  buyer?: string;
  minValue?: number;
  maxValue?: number;
  q?: string;
  page?: number;
  lang?: string;
}): Promise<{
  items: Investigation[];
  page: number;
  pageSize: number;
  total: number;
}> {
  const col = await getCollection('investigations');
  const pageSize = INVESTIGATIONS_PAGE_SIZE;
  const page = params.page ?? 1;
  const skip = (page - 1) * pageSize;

  const match: Record<string, unknown> = {};
  if (params.family) match['signalFamily'] = params.family;
  if (params.priority) match['reviewPriority'] = params.priority;
  if (params.buyer) match['buyer.id'] = params.buyer;
  if (params.minValue !== undefined || params.maxValue !== undefined) {
    const range: Record<string, number> = {};
    if (params.minValue !== undefined) range['$gte'] = params.minValue;
    if (params.maxValue !== undefined) range['$lte'] = params.maxValue;
    match['totalValue'] = range;
  }
  if (params.q) match['$text'] = { $search: params.q };

  const pipeline: Record<string, unknown>[] = [
    { $match: match },
    {
      $addFields: {
        priorityRank: {
          $switch: {
            branches: [
              { case: { $eq: ['$reviewPriority', 'high'] }, then: 0 },
              { case: { $eq: ['$reviewPriority', 'medium'] }, then: 1 },
              { case: { $eq: ['$reviewPriority', 'low'] }, then: 2 },
            ],
            default: 3,
          },
        },
      },
    },
    {
      $facet: {
        total: [{ $count: 'count' }],
        items: [
          { $sort: { priorityRank: 1, updatedAt: -1, totalValue: -1 } },
          { $skip: skip },
          { $limit: pageSize },
        ],
      },
    },
  ];

  const [result] = (await col.aggregate(pipeline as never).toArray()) as Array<{
    total: Array<{ count: number }>;
    items: Investigation[];
  }>;
  const items = result?.items ?? [];
  const total = result?.total[0]?.count ?? 0;
  log(
    `query=listPaged page=${page} pageSize=${pageSize} returned=${items.length} total=${total}`,
  );
  return { items, page, pageSize, total };
}

/** Min/max `totalValue` across all investigations (filter slider bounds). */
export async function getInvestigationValueBounds(): Promise<{
  min: number;
  max: number;
}> {
  const col = await getCollection('investigations');
  const [agg] = (await col
    .aggregate([
      {
        $group: {
          _id: null,
          min: { $min: '$totalValue' },
          max: { $max: '$totalValue' },
        },
      },
    ] as never)
    .toArray()) as Array<{ min: number; max: number }>;
  const bounds = { min: agg?.min ?? 0, max: agg?.max ?? 0 };
  log(`query=valueBounds min=${bounds.min} max=${bounds.max}`);
  return bounds;
}

export async function upsertInvestigation(doc: Investigation): Promise<void> {
  const col = await getCollection('investigations');
  await col.replaceOne({ _id: doc._id } as never, doc as never, { upsert: true });
}

/** Area 07 dedup lookup — alias of `getInvestigationByCaseKey`. */
export async function getByCaseKey(caseKey: string): Promise<WithId<Investigation> | null> {
  return getInvestigationByCaseKey(caseKey);
}

/**
 * evidenceHash-guarded upsert (Area 07 dedup). When the caller already knows
 * the stored hash and it equals the new doc's `evidenceHash`, the write is
 * skipped entirely (idempotent monthly re-run). Otherwise the canonical doc is
 * overwritten (insert or supersede with `version` already bumped by caller).
 */
export async function upsertInvestigationGuarded(
  doc: Investigation,
  existingHash?: string,
): Promise<{ skipped: boolean }> {
  if (existingHash !== undefined && existingHash === doc.evidenceHash) {
    return { skipped: true };
  }
  const col = await getCollection('investigations');
  await col.replaceOne({ _id: doc._id } as never, doc as never, { upsert: true });
  return { skipped: false };
}
