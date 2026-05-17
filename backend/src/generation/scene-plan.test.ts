import { describe, it, expect } from 'vitest';
import { resolveScenePlan } from './scene-plan.js';
import type {
  SceneSignal,
  SceneEvidenceItem,
  SceneInvestigation,
} from '../scene-contract/types.js';

const investigation: SceneInvestigation = {
  buyer: { id: 'GT-NIT:4132726', name: 'Ministerio de Salud' },
  supplier: {
    id: 'GT-NIT:1234567',
    displayNameEs: 'Proveedor A',
    displayNameEn: 'Supplier A',
    isIndividual: false,
  },
  reviewPriority: 'high',
  totalValue: 650000,
  currency: 'GTQ',
  evidence: [{ field: 'totalValue', value: 650000 }],
};

const signals: SceneSignal[] = [
  {
    rule_id: 'single_bidder',
    ocid: 'ocds-abc-001',
    family: 'F1',
    severity: 'high',
    evidence: [{ field: 'awards.value.amount', value: 650000, comparison: '3x median' }],
  },
];

const evidence: SceneEvidenceItem[] = investigation.evidence;

describe('resolveScenePlan', () => {
  it('always emits all 7 chapters', () => {
    const out = resolveScenePlan(['single_bidder'], {}, signals, evidence, investigation);
    expect(Object.keys(out).sort()).toEqual(
      [
        'cover',
        'elCaso',
        'sigueElDinero',
        'lasConexiones',
        'evidencia',
        'cronologia',
        'cierre',
      ].sort(),
    );
  });

  it('bad/unbound params → entry source:"fallback", sceneId = chapter default', () => {
    const out = resolveScenePlan(
      ['single_bidder'],
      {
        cover: {
          sceneId: 'CoverHeadline',
          // heroStat.value is quant but has NO resolving ref → fails rule 3
          params: { heroStat: { value: 999999, ref: 'ev:9999' } },
        },
      },
      signals,
      evidence,
      investigation,
    );
    expect(out['cover']!.source).toBe('fallback');
    expect(out['cover']!.sceneId).toBe('CoverHeadline'); // chapter default
  });

  it('valid params → entry source:"llm"', () => {
    const out = resolveScenePlan(
      ['single_bidder'],
      {
        cover: {
          sceneId: 'CoverHeadline',
          params: {
            kicker: 'Compras públicas',
            headline: 'Un proveedor domina las adjudicaciones',
            dek: 'Una revisión de datos abiertos.',
            bgVariant: 'duotone',
            heroStat: {
              label: 'Valor total',
              value: 650000,
              unit: 'GTQ',
              ref: 'sig:single_bidder.evidence.0.value',
            },
            buyer: 'Ministerio de Salud',
            supplierDisplay: 'Proveedor A',
            reviewPriority: 'high',
            intro: 'Una introducción de prueba al expediente.',
          },
        },
      },
      signals,
      evidence,
      investigation,
    );
    expect(out['cover']!.source).toBe('llm');
    expect(out['cover']!.sceneId).toBe('CoverHeadline');
  });

  it('out-of-shortlist sceneId → fallback default', () => {
    const out = resolveScenePlan(
      ['single_bidder'],
      { cierre: { sceneId: 'NotARealScene', params: {} } },
      signals,
      evidence,
      investigation,
    );
    expect(out['cierre']!.source).toBe('fallback');
    expect(out['cierre']!.sceneId).toBe('ClosingStatement');
  });
});
