import type { Benchmark } from './benchmarks.js';

export const validBenchmark: Benchmark = {
  _id: 'scope:2025-08..2026-07',
  periodScope: { minMonth: '2025-08', maxMonth: '2026-07' },
  categoryPrice: {
    '8110': {
      median: 50000,
      p25: 30000,
      p75: 80000,
      count: 42,
      level: 'family',
      tendererCountP25: 1,
    },
  },
  peerCategoryMedian: {
    '8110': 48000,
  },
  buyerMethodMix: {
    'GT-NIT:4132726': {
      'compra-directa': { valueShare: 0.7, countShare: 0.6 },
      'licitacion-publica': { valueShare: 0.3, countShare: 0.4 },
    },
  },
  nationalMethodBaseline: {
    'compra-directa': 0.35,
    'licitacion-publica': 0.65,
  },
  cohortStats: {
    individual: { p90: 120000, count: 18 },
  },
  buyerWeeklyBaseline: {
    'GT-NIT:4132726': { medianWeeklyAwardCount: 2, p75WeeklyAwardCount: 4 },
  },
  splittingClusters: [
    {
      buyerId: 'GT-NIT:4132726',
      canonicalSupplierId: 'GT-NIT:7894880',
      family: '8110',
      ocids: ['ocds-abc-001', 'ocds-abc-002', 'ocds-abc-003'],
      dates: [
        '2026-04-01T00:00:00-06:00',
        '2026-04-10T00:00:00-06:00',
        '2026-04-20T00:00:00-06:00',
      ],
      amounts: [40000, 45000, 30000],
      clusterSum: 115000,
    },
  ],
  failedThenAwardIndex: {
    'GT-NIT:4132726|8110': [
      {
        priorOcid: 'ocds-abc-000',
        statusDetails: 'Desierto',
        date: '2026-03-01T00:00:00-06:00',
      },
    ],
  },
  repeatWinnerIndex: {
    'GT-NIT:4132726': {
      tendererSets: [
        {
          tendererIds: ['GT-NIT-7894880', 'GT-NIT-15856801'],
          winnerIds: ['GT-NIT-7894880'],
          occurrences: 4,
          winnerWinCount: 4,
        },
      ],
    },
  },
};
