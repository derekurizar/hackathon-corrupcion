import { describe, it, expect } from 'vitest';
import { deriveFromEvidence, FIXED_CAVEAT } from './derive.js';
import { validateScenePlan } from './validator.js';
import { defaultScene } from './shortlist.js';
import { SCENES } from './scenes/index.js';
import type {
  Chapter,
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
    evidence: [
      { field: 'bidCounts.count', value: 1 },
      { field: 'awards.value.amount', value: 650000, comparison: '3x median' },
    ],
  },
];

const evidence: SceneEvidenceItem[] = investigation.evidence;

const chapters: Chapter[] = [
  'cover',
  'elCaso',
  'sigueElDinero',
  'lasConexiones',
  'evidencia',
  'cronologia',
  'cierre',
];

describe.each(chapters)('deriveFromEvidence(%s)', (chapter) => {
  it('produces params that pass the default scene schema', () => {
    const params = deriveFromEvidence(chapter, signals, evidence, investigation);
    const sceneId = defaultScene(chapter);
    const descriptor = SCENES[sceneId]!;
    const parsed = descriptor.schema.safeParse(params);
    expect(parsed.success, JSON.stringify(parsed)).toBe(true);
  });

  it('round-trips through validateScenePlan to a renderable default entry', () => {
    // Derived params carry no resolving refs. For chapters that HAVE quant
    // params (cover/elCaso/sigueElDinero/lasConexiones) the safety net (rule 3)
    // forces source:"fallback". For ref-free default scenes (evidencia /
    // cronologia / cierre) the derived params are themselves the authoritative
    // server truth and legitimately validate as source:"llm" — either way the
    // article always renders the default scene. (Deviation from the dev plan's
    // blanket "always fallback" — see return summary.)
    const QUANT_FALLBACK_CHAPTERS: Chapter[] = [
      'cover',
      'elCaso',
      'sigueElDinero',
      'lasConexiones',
    ];
    const params = deriveFromEvidence(chapter, signals, evidence, investigation);
    const out = validateScenePlan(
      chapter,
      { sceneId: defaultScene(chapter), params, source: 'llm' },
      signals,
      evidence,
      investigation,
    );
    expect(out.sceneId).toBe(defaultScene(chapter));
    if (QUANT_FALLBACK_CHAPTERS.includes(chapter)) {
      expect(out.source).toBe('fallback');
    } else {
      expect(out.source).toBe('llm');
    }
    // Always renders: params satisfy the default scene schema.
    expect(SCENES[out.sceneId]!.schema.safeParse(out.params).success).toBe(true);
  });
});

describe('deriveFromEvidence — never throws on empty inputs', () => {
  const empty: SceneInvestigation = {
    buyer: { id: '', name: '' },
    supplier: {
      id: '',
      displayNameEs: '',
      displayNameEn: '',
      isIndividual: true,
    },
    reviewPriority: 'low',
    totalValue: 0,
    currency: 'GTQ',
    evidence: [],
  };
  it.each(chapters)('chapter %s yields a schema-valid default', (chapter) => {
    const params = deriveFromEvidence(chapter, [], [], empty);
    const descriptor = SCENES[defaultScene(chapter)]!;
    expect(descriptor.schema.safeParse(params).success).toBe(true);
  });

  it('cierre always carries the fixed non-empty caveat', () => {
    const params = deriveFromEvidence('cierre', [], [], empty);
    expect(params['caveat']).toBe(FIXED_CAVEAT);
    expect((params['caveat'] as string).length).toBeGreaterThan(0);
  });
});
