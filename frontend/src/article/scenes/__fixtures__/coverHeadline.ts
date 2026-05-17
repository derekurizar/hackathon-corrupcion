import type { InvestigationFull } from '@/api/schemas';

/** Schema-valid `CoverHeadline` params (mirrors the synced Zod schema). */
export const coverHeadlineParams = {
  kicker: 'COMPRAS PÚBLICAS',
  headline: 'Ministerio de Salud — señales de revisión',
  dek: 'Un patrón de adjudicaciones que vale la pena revisar en detalle.',
  bgVariant: 'duotone' as const,
  intro: 'Fixture intro paragraph for cover headline.',
  heroStat: {
    label: 'Valor total revisado',
    value: 3_200_000,
    unit: 'GTQ',
    ref: 'sig:supplier_concentration_per_buyer',
  },
  buyer: 'Ministerio de Salud Pública',
  supplierDisplay: 'Proveedor anónimo A',
  reviewPriority: 'high' as const,
};

/** Minimal `InvestigationFull` shared by every scene fixture/test. */
export const sampleInvestigation: InvestigationFull = {
  caseKey: 'GT-2024-001',
  buyer: { id: 'GT-NIT:4132726', name: 'Ministerio de Salud Pública' },
  supplier: {
    displayNameEs: 'Proveedor anónimo A',
    displayNameEn: 'Anonymous supplier A',
    isIndividual: false,
    id: 'sup-1',
  },
  signalFamily: 'F2',
  reviewPriority: 'high',
  totalValue: 3_200_000,
  currency: 'GTQ',
  timeWindow: '2023-2024',
  headline: {
    kicker: 'EL CASO',
    headline: 'Titular',
    dek: 'Bajada',
  },
  ruleIds: ['supplier_concentration_per_buyer'],
  story: {},
  scenePlan: {},
  evidence: [
    { field: 'totalValue', value: 3_200_000 },
    { field: 'topShare', value: 0.82 },
  ],
  audio: undefined,
  podcastCuePoints: undefined,
  updatedAt: '2026-05-16T00:00:00Z',
};
