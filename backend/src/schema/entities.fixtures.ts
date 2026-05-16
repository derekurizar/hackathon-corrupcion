import type { Entity } from './entities.js';

export const validEntity: Entity = {
  _id: 'GT-NIT:1234567',
  name: 'PROVEEDOR TEST S.A.',
  kind: 'supplier',
  entityType: 'company',
  rollup: {
    awardCount: 3,
    awardValue: 150000,
    buyerIds: ['GT-NIT:4132726'],
    categoryFamilies: ['8110'],
    firstAwardDate: '2025-01-15T00:00:00Z',
    lastAwardDate: '2026-02-01T00:00:00Z',
    historyAvgValue: 50000,
  },
};
