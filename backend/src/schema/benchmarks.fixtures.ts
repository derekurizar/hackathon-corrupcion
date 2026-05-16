import type { Benchmark } from './benchmarks.js';

export const validBenchmark: Benchmark = {
  _id: '2025-08..2026-07',
  periodScope: { minMonth: '2025-08', maxMonth: '2026-07' },
  categoryPrice: {
    '8110': { median: 50000, p25: 30000, p75: 80000, count: 42, level: 'family' },
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
};
