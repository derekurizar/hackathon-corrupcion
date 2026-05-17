import type { Investigation } from './investigations.js';

export const validInvestigation: Investigation = {
  _id: 'a3f1c9e8b2d4567890abcdef1234567890abcdef1234567890abcdef12345678',
  buyer: { id: 'GT-NIT:4132726', name: 'Ministerio de Salud' },
  supplier: {
    id: 'GT-NIT:1234567',
    displayNameEs: 'Proveedor Test S.A.',
    displayNameEn: 'Test Supplier S.A.',
    isIndividual: false,
  },
  signalFamily: 'F2',
  timeWindow: '2025-08..2026-07',
  reviewPriority: 'high',
  ruleIds: ['single_bidder', 'price_spike'],
  signalIds: ['sig-0001', 'sig-0002'],
  totalValue: 650000,
  currency: 'GTQ',
  es: {
    cover: {
      kicker: 'Compras públicas',
      headline: 'Un proveedor, múltiples adjudicaciones',
      dek: 'Una revisión de los datos abiertos de Guatecompras.',
    },
    elCaso: 'El comprador adjudicó varios contratos al mismo proveedor.',
    sigueElDinero: 'El valor total supera el promedio de la categoría.',
    lasConexiones: 'El proveedor aparece en múltiples adjudicaciones del mismo comprador.',
    cronologia: 'Las adjudicaciones ocurrieron entre agosto y febrero.',
    cierre: {
      queSignificaYQueNo: 'Indica un patrón que merece revisión, no una conclusión.',
      caveat: 'Basado únicamente en datos públicos de Guatecompras.',
    },
    keyFindings: ['Único oferente', 'Valor por encima de la mediana de la categoría'],
  },
  en: {
    cover: {
      kicker: 'Public procurement',
      headline: 'One supplier, multiple awards',
      dek: 'A review of open Guatecompras data.',
    },
    theCase: 'The buyer awarded several contracts to the same supplier.',
    followTheMoney: 'The total value exceeds the category average.',
    theConnections: 'The supplier appears across multiple awards from the same buyer.',
    timeline: 'Awards occurred between August and February.',
    closing: {
      whatItMeans: 'It indicates a pattern worth reviewing, not a conclusion.',
      caveat: 'Based solely on public Guatecompras data.',
    },
    keyFindings: ['Single bidder', 'Value above category median'],
  },
  scenePlan: {
    scene01: {
      sceneId: 'cover',
      params: { headline: 'One supplier, multiple awards' },
      source: 'llm',
    },
    scene02: {
      sceneId: 'follow-the-money',
      params: { total: 650000 },
      source: 'fallback',
    },
  },
  evidence: [{ field: 'bidCounts.count', value: 1 }],
  evidenceHash: 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
  version: 1,
  status: 'published',
  createdAt: '2026-02-15T00:00:00Z',
  updatedAt: '2026-02-15T00:00:00Z',
};

export const validInvestigationWithAudio: Investigation = {
  ...validInvestigation,
  _id: 'b4e2dac9c3e5678901bcdef02345678901bcdef02345678901bcdef023456789',
  // Site-relative CloudFront path — the on-write format produced by the CLI
  // (`/${audioKey(caseKey, version, lang)}`).
  audio: {
    es: '/audio/b4e2dac9c3e5678901bcdef02345678901bcdef02345678901bcdef023456789/1/es.mp3',
    en: '/audio/b4e2dac9c3e5678901bcdef02345678901bcdef02345678901bcdef023456789/1/en.mp3',
  },
  podcastCuePoints: {
    es: [{ chapter: 'El caso', tSec: 0 }],
    en: [{ chapter: 'The case', tSec: 0 }],
  },
};
