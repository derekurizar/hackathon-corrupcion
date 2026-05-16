import {
  EditionSchema,
  DashboardStatsSchema,
  type Edition,
  type DashboardStats,
} from '../schema/index.js';
import { getCollection } from '../db/collections.js';
import type { CaseBundle } from './rank.js';

type Family = 'F1' | 'F2' | 'F3' | 'F4';

/**
 * Max numeric evidence value whose `field` hints money — the case's headline
 * "value flagged" (same formula as rank.ts `caseTotalValue`).
 */
export function bundleTotalValue(bundle: CaseBundle): number {
  let max = 0;
  let found = false;
  for (const e of bundle.evidence) {
    const f = e.field.toLowerCase();
    if (
      (f.includes('value') || f.includes('amount')) &&
      typeof e.value === 'number' &&
      Number.isFinite(e.value)
    ) {
      if (!found || e.value > max) {
        max = e.value;
        found = true;
      }
    }
  }
  return found ? max : 0;
}

/**
 * The featured "issue" for one publish run (idea/04 §"Editions"). `_id` is the
 * run id/timestamp (NOT a calendar month). Lead = the top-ranked bundle;
 * highlights = the next three.
 */
export function buildEdition(
  runId: string,
  publishedAt: string,
  bundles: CaseBundle[],
): Edition {
  const byFamily: Record<Family, number> = { F1: 0, F2: 0, F3: 0, F4: 0 };
  let totalValueFlagged = 0;
  for (const b of bundles) {
    byFamily[b.family] += 1;
    totalValueFlagged += bundleTotalValue(b);
  }
  const doc: Edition = {
    _id: runId,
    publishedAt,
    leadCaseKey: bundles[0]?.caseKey ?? '',
    highlightCaseKeys: bundles.slice(1, 4).map((b) => b.caseKey),
    stats: {
      count: bundles.length,
      totalValueFlagged,
      byFamily,
    },
  };
  return EditionSchema.parse(doc);
}

/**
 * Recomputes the single `dashboardStats` doc (`_id:'current'`) from the
 * collections — never incremented, so a monthly re-run never double-counts
 * (idea/04 §"Cost & runtime guards", idea/06 §"dashboardStats"). All fields
 * are validated against `DashboardStatsSchema` before return.
 */
export async function recomputeDashboardStats(): Promise<DashboardStats> {
  const invCol = await getCollection('investigations');
  const entCol = await getCollection('entities');
  const relCol = await getCollection('curatedReleases');

  const [
    records,
    investigations,
    entities,
    familyGroups,
    priorityGroups,
    methodGroups,
    monthGroups,
    valueAgg,
    topBuyers,
    trendGroups,
  ] = await Promise.all([
    relCol.countDocuments({} as never),
    invCol.countDocuments({} as never),
    entCol.countDocuments({} as never),
    invCol
      .aggregate([{ $group: { _id: '$signalFamily', n: { $sum: 1 } } }])
      .toArray(),
    invCol
      .aggregate([{ $group: { _id: '$reviewPriority', n: { $sum: 1 } } }])
      .toArray(),
    relCol
      .aggregate([
        {
          $group: {
            _id: '$tender.procurementMethodDetails',
            n: { $sum: 1 },
          },
        },
      ])
      .toArray(),
    relCol
      .aggregate([
        {
          $group: {
            _id: { year: '$year', month: '$month' },
          },
        },
      ])
      .toArray(),
    relCol
      .aggregate([
        { $unwind: '$awards' },
        { $group: { _id: null, v: { $sum: '$awards.value.amount' } } },
      ])
      .toArray(),
    invCol
      .aggregate([
        {
          $group: {
            _id: '$buyer.id',
            name: { $first: '$buyer.name' },
            value: { $sum: '$totalValue' },
          },
        },
        { $sort: { value: -1 } },
        { $limit: 5 },
      ])
      .toArray(),
    invCol
      .aggregate([
        {
          $group: {
            _id: '$timeWindow',
            flagged: { $sum: 1 },
            value: { $sum: '$totalValue' },
          },
        },
        { $sort: { _id: 1 } },
      ])
      .toArray(),
  ]);

  const byFamily: Record<Family, number> = { F1: 0, F2: 0, F3: 0, F4: 0 };
  for (const g of familyGroups) {
    const k = g['_id'] as string;
    if (k === 'F1' || k === 'F2' || k === 'F3' || k === 'F4') {
      byFamily[k] = g['n'] as number;
    }
  }

  const priorityDist = { high: 0, medium: 0, low: 0 };
  for (const g of priorityGroups) {
    const k = g['_id'] as string;
    if (k === 'high' || k === 'medium' || k === 'low') {
      priorityDist[k] = g['n'] as number;
    }
  }

  const methodBreakdown: Record<string, number> = {};
  for (const g of methodGroups) {
    const k = (g['_id'] as string | null) ?? 'unknown';
    methodBreakdown[k] = g['n'] as number;
  }

  const trend = trendGroups.map((g) => ({
    month: String(g['_id'] ?? ''),
    flagged: (g['flagged'] as number) ?? 0,
    value: (g['value'] as number) ?? 0,
  }));

  const doc: DashboardStats = {
    _id: 'current',
    computedAt: new Date().toISOString(),
    counters: {
      records,
      valueAnalyzed: (valueAgg[0]?.['v'] as number) ?? 0,
      entities,
      monthsCovered: monthGroups.length,
      investigations,
    },
    methodBreakdown,
    byFamily,
    priorityDist,
    trend,
    topBuyersByFlaggedValue: topBuyers.map((b) => ({
      id: String(b['_id'] ?? ''),
      name: String(b['name'] ?? b['_id'] ?? ''),
      value: (b['value'] as number) ?? 0,
    })),
  };

  return DashboardStatsSchema.parse(doc);
}
