import type { DashboardStats } from './dashboard-stats.js';

export const validDashboardStats: DashboardStats = {
  _id: 'current',
  computedAt: '2026-02-15T00:00:00Z',
  counters: {
    records: 120000,
    valueAnalyzed: 9800000000,
    entities: 45000,
    monthsCovered: 12,
    investigations: 87,
  },
  methodBreakdown: {
    'compra-directa': 0.42,
    'licitacion-publica': 0.58,
  },
  byFamily: { F1: 30, F2: 25, F3: 20, F4: 12 },
  priorityDist: { high: 20, medium: 40, low: 27 },
  trend: [
    { month: '2025-12', flagged: 8, value: 1200000 },
    { month: '2026-01', flagged: 11, value: 1800000 },
  ],
  topBuyersByFlaggedValue: [
    { id: 'GT-NIT:4132726', name: 'Ministerio de Salud', value: 3200000 },
  ],
};
