import type { CuratedRelease } from '../../schema/curated-release.js';
import type { Benchmark } from '../../schema/benchmarks.js';
import type { EntityIndex, RollupData } from '../types.js';
import { rawToCanonical } from '../entity-id.js';

/** A schema-valid CuratedRelease with sane defaults; override any field. */
export function makeRelease(over: Partial<CuratedRelease> = {}): CuratedRelease {
  const base: CuratedRelease = {
    ocid: 'ocds-test-0001',
    id: 'ocds-test-0001-2026-04-01T00:00:00-06:00',
    date: '2026-04-01T12:00:00-06:00',
    year: 2026,
    month: 4,
    buyer: { id: 'GT-NIT-4132726', name: 'MUNICIPALIDAD DE PRUEBA' },
    tender: {
      id: 'GT-NOG-0001',
      title: 'Test tender',
      statusDetails: 'Adjudicado',
      procurementMethodDetails: 'Compra Directa con Oferta Electrónica (Art. 43 LCE Inciso b)',
      mainProcurementCategory: 'goods',
      numberOfTenderers: 3,
      datePublished: '2026-04-01T08:00:00-06:00',
      tenderPeriod: { startDate: '2026-04-01T08:00:00-06:00', endDate: null },
      items: [
        {
          classificationId: '81101513',
          scheme: 'UNSPSC',
          description: 'item',
          quantity: 1,
          unitName: 'Unidad',
        },
      ],
      itemFamilies: ['8110'],
      documentsSummary: {
        count: 3,
        types: ['purchaseRequest'],
        firstDatePublished: '2026-04-01T08:00:00-06:00',
      },
    },
    bids: [],
    bidCounts: { count: 0, valid: 0, disqualified: 0 },
    awards: [
      {
        id: 'GT-ADJ-0001',
        date: '2026-04-02T10:00:00-06:00',
        status: 'active',
        statusDetails: 'Habilitado',
        value: { amount: 50000, currency: 'GTQ' },
        supplierIds: ['GT-NIT-7894880'],
      },
    ],
    contracts: [],
    region: 'GUATEMALA',
  };
  return { ...base, ...over };
}

/** Minimal benchmark with overridable buckets. */
export function makeBenchmark(over: Partial<Benchmark> = {}): Benchmark {
  const base: Benchmark = {
    _id: 'scope:2026-04..2026-04',
    periodScope: { minMonth: '2026-04', maxMonth: '2026-04' },
    categoryPrice: {},
    peerCategoryMedian: {},
    buyerMethodMix: {},
    nationalMethodBaseline: {},
    cohortStats: { individual: { p90: 0, count: 0 } },
    buyerWeeklyBaseline: {},
    splittingClusters: [],
    failedThenAwardIndex: {},
    repeatWinnerIndex: {},
  };
  return { ...base, ...over };
}

/** EntityIndex stub: rollups + types keyed by canonical id. */
export function makeEntityIndex(opts: {
  rollups?: Record<string, RollupData>;
  types?: Record<string, 'company' | 'individual' | 'unknown'>;
}): EntityIndex {
  const rollups = opts.rollups ?? {};
  const types = opts.types ?? {};
  return {
    canonicalOf: (rawId) => rawToCanonical(rawId),
    rollup: (id) => rollups[id],
    entityType: (id) => types[id] ?? 'unknown',
    allCanonicalEntityIds: new Set([
      ...Object.keys(rollups),
      ...Object.keys(types),
    ]),
  };
}
