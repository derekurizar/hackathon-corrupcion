import { describe, it, expect } from 'vitest';
import { CuratedReleaseSchema } from './curated-release.js';

const validFixture = {
  ocid: 'ocds-abc-001',
  id: 'release-001',
  date: '2026-01-15T00:00:00Z',
  year: 2026,
  month: 1,
  buyer: { id: 'buyer-1', name: 'Ministerio de Salud' },
  tender: {
    id: 'tender-001',
    title: 'Compra de medicamentos',
    statusDetails: 'awarded',
    procurementMethodDetails: 'open',
    mainProcurementCategory: 'goods',
    numberOfTenderers: 3,
    datePublished: '2026-01-01T00:00:00Z',
    tenderPeriod: { startDate: '2026-01-01T00:00:00Z', endDate: null },
    items: [
      {
        classificationId: 'class-001',
        scheme: 'UNSPSC',
        description: 'Amoxicilina 500mg',
        quantity: 1000,
        unitName: 'capsule',
      },
    ],
    itemFamilies: ['51100000'],
    documentsSummary: {
      count: 2,
      types: ['tenderNotice'],
      firstDatePublished: '2026-01-01T00:00:00Z',
    },
  },
  bids: [{ status: 'valid', amount: 50000.0, tendererId: 'supplier-1' }],
  bidCounts: { count: 3, valid: 2, disqualified: 1 },
  awards: [
    {
      id: 'award-001',
      date: '2026-02-01T00:00:00Z',
      status: 'active',
      statusDetails: 'awarded',
      value: { amount: 50000.0, currency: 'GTQ' },
      supplierIds: ['supplier-1'],
    },
  ],
  contracts: [
    {
      id: 'contract-001',
      awardID: 'award-001',
      dateSigned: '2026-02-15T00:00:00Z',
      value: { amount: 50000.0, currency: 'GTQ' },
      period: { start: '2026-03-01T00:00:00Z', end: '2026-12-31T00:00:00Z' },
      documentsCount: 1,
      contractNumber: 'CON-2026-001',
    },
  ],
  region: 'Guatemala',
};

describe('CuratedReleaseSchema', () => {
  it('parses a valid fixture', () => {
    const result = CuratedReleaseSchema.parse(validFixture);
    expect(result.ocid).toBe('ocds-abc-001');
    expect(result.tender.tenderPeriod.endDate).toBeNull();
  });

  it('rejects when awards[].value.amount is a string', () => {
    const bad = {
      ...validFixture,
      awards: [{ ...validFixture.awards[0], value: { amount: 'not-a-number', currency: 'GTQ' } }],
    };
    const result = CuratedReleaseSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });
});
