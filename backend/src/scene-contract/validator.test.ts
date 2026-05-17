import { describe, it, expect } from 'vitest';
import { validateScenePlan } from './validator.js';
import type {
  ScenePlanEntry,
  SceneSignal,
  SceneEvidenceItem,
  SceneInvestigation,
} from './types.js';

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

// A fully valid CoverHeadline (default scene for `cover`). heroStat.value
// numeric-matches the ref'd evidence value; bound params are server-overwritten.
function validCoverEntry(): ScenePlanEntry {
  return {
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
      intro: 'test intro',
    },
    source: 'llm',
  };
}

describe('validateScenePlan — full success', () => {
  it('returns source:"llm" for a valid default-scene entry with a resolving quant ref', () => {
    const out = validateScenePlan('cover', validCoverEntry(), signals, evidence, investigation);
    expect(out.source).toBe('llm');
    expect(out.sceneId).toBe('CoverHeadline');
    // bound params overwritten with authoritative server values
    expect((out.params['heroStat'] as Record<string, unknown>)['unit']).toBe('GTQ');
    expect(out.params['buyer']).toBe('Ministerio de Salud');
  });
});

describe('validateScenePlan — rule 1 (sceneId not in shortlist)', () => {
  it('falls back when sceneId is not allowed for the chapter', () => {
    const bad = { ...validCoverEntry(), sceneId: 'NotARealScene' };
    const out = validateScenePlan('cover', bad, signals, evidence, investigation);
    expect(out.source).toBe('fallback');
    expect(out.sceneId).toBe('CoverHeadline');
  });

  it('falls back when sceneId belongs to a different chapter', () => {
    const bad = { ...validCoverEntry(), sceneId: 'ClosingStatement' };
    const out = validateScenePlan('cover', bad, signals, evidence, investigation);
    expect(out.source).toBe('fallback');
  });
});

describe('validateScenePlan — rule 3 (quant ref must resolve; no value-match)', () => {
  it('falls back when the quant ref does not resolve', () => {
    const e = validCoverEntry();
    (e.params['heroStat'] as Record<string, unknown>)['ref'] = 'sig:does_not_exist';
    const out = validateScenePlan('cover', e, signals, evidence, investigation);
    expect(out.source).toBe('fallback');
  });

  it('accepts (source:"llm") when the quant value differs from the resolved ref row value', () => {
    // New contract: the cited ref only needs to RESOLVE (traceability /
    // no invented citations). The figure itself is the LLM's — legitimate
    // numbers (shares, rollup aggregates, benchmark metrics) never appear as
    // a single evidence cell, so a value-equality check forced a universal
    // fallback. The figure no longer has to equal the cited row's `.value`.
    const e = validCoverEntry();
    (e.params['heroStat'] as Record<string, unknown>)['value'] = 999999;
    const out = validateScenePlan('cover', e, signals, evidence, investigation);
    expect(out.source).toBe('llm');
  });

  it('falls back when the ref string is syntactically invalid', () => {
    const e = validCoverEntry();
    (e.params['heroStat'] as Record<string, unknown>)['ref'] = 'garbage';
    const out = validateScenePlan('cover', e, signals, evidence, investigation);
    expect(out.source).toBe('fallback');
  });
});

describe('validateScenePlan — rule 4 (presentational emphasis target must exist)', () => {
  const flowSignals: SceneSignal[] = [
    {
      rule_id: 'supplier_concentration_per_buyer',
      ocid: 'ocds-abc-001',
      family: 'F2',
      severity: 'high',
      evidence: [
        { field: 'totalValue', value: 650000 },
        { field: 'amount', value: 650000 },
        { field: 'share', value: 1 },
      ],
    },
  ];
  const flowEvidence: SceneEvidenceItem[] = [];

  function flowEntry(emphasis: string): ScenePlanEntry {
    return {
      sceneId: 'MoneyFlowStreams',
      params: {
        buyer: 'Ministerio de Salud',
        totalValue: 650000,
        totalRef: 'ev:0',
        streams: [
          {
            supplierId: 'GT-NIT:1234567',
            supplierDisplay: 'Proveedor A',
            amount: 650000,
            amountRef: 'ev:1',
            share: 1,
            shareRef: 'ev:2',
          },
        ],
        emphasisSupplierId: emphasis,
        caption: 'El dinero fluye a un proveedor.',
        narration: 'test narration',
      },
      source: 'llm',
    };
  }

  it('succeeds when emphasisSupplierId points at an in-scene supplier', () => {
    const out = validateScenePlan(
      'sigueElDinero',
      flowEntry('GT-NIT:1234567'),
      flowSignals,
      flowEvidence,
      investigation,
    );
    expect(out.source).toBe('llm');
  });

  it('falls back when emphasisSupplierId does not match any in-scene id', () => {
    const out = validateScenePlan(
      'sigueElDinero',
      flowEntry('GT-NIT:9999999'),
      flowSignals,
      flowEvidence,
      investigation,
    );
    expect(out.source).toBe('fallback');
    expect(out.sceneId).toBe('MoneyFlowStreams');
  });
});

describe('validateScenePlan — rule 5 (ClosingStatement caveat mandatory)', () => {
  function closingEntry(caveat: string): ScenePlanEntry {
    return {
      sceneId: 'ClosingStatement',
      params: {
        whatItMeans: 'Indica un patrón que merece revisión.',
        caveat,
        ctas: ['methodology', 'listen', 'share'],
        conclusions: ['test conclusion'],
      },
      source: 'llm',
    };
  }

  it('succeeds with a non-empty caveat', () => {
    const out = validateScenePlan(
      'cierre',
      closingEntry('Señales de revisión, no conclusiones.'),
      signals,
      evidence,
      investigation,
    );
    expect(out.source).toBe('llm');
  });

  it('falls back when caveat is empty/whitespace', () => {
    const out = validateScenePlan('cierre', closingEntry('   '), signals, evidence, investigation);
    expect(out.source).toBe('fallback');
    expect(out.sceneId).toBe('ClosingStatement');
    expect(typeof out.params['caveat']).toBe('string');
    expect((out.params['caveat'] as string).length).toBeGreaterThan(0);
  });
});
