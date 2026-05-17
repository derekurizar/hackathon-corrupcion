import { describe, it, expect } from 'vitest';
import { deriveFromEvidence, FIXED_CAVEAT } from './derive.js';
import { validateScenePlan } from './validator.js';
import { defaultScene } from './shortlist.js';
import { SCENES } from './scenes/index.js';
import type { Chapter, SceneSignal, SceneEvidenceItem, SceneInvestigation } from './types.js';

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
    // Hackathon-relaxed validator: quant refs (rule 3) and emphasis targets
    // (rule 4) no longer force a fallback, so derived default-scene params —
    // which are schema-valid by construction and carry the mandatory caveat —
    // round-trip to source:"llm" for EVERY chapter. The article always renders
    // the default scene regardless; only the `source` label changed.
    const params = deriveFromEvidence(chapter, signals, evidence, investigation);
    const out = validateScenePlan(
      chapter,
      { sceneId: defaultScene(chapter), params, source: 'llm' },
      signals,
      evidence,
      investigation,
    );
    expect(out.sceneId).toBe(defaultScene(chapter));
    expect(out.source).toBe('llm');
    // Always renders: params satisfy the default scene schema.
    expect(SCENES[out.sceneId]!.schema.safeParse(out.params).success).toBe(true);
  });
});

describe('deriveFromEvidence(elCaso) — human-readable facts', () => {
  it('renders facts with Spanish labels and formatted currency, never raw dot-notation', () => {
    const params = deriveFromEvidence('elCaso', signals, evidence, investigation);
    const facts = params['facts'] as Array<{ text: string }>;
    const texts = facts.map((f) => f.text);

    // No raw OCDS dot-notation leaks to the reader.
    for (const t of texts) {
      expect(t).not.toMatch(/^[a-z]+(?:\[\])?\.[a-z]/);
      expect(t).not.toContain('bidCounts.count');
      expect(t).not.toContain('awards.value.amount');
    }

    // 'bidCounts.count' is unknown. No lowercase "prefix." precedes the
    // camelCase, so nothing is stripped; the camelCase split + Title case
    // yields "Bid Counts.count".
    expect(texts).toContain('Bid Counts.count: 1');
    // 'awards.value.amount' is unknown but monetary (contains "amount") → the
    // sanitized fallback strips only the first "awards." segment, leaving
    // "Value.amount", and the value is es-GT currency-formatted (no decimals).
    const moneyFact = texts.find((t) => t.startsWith('Value.amount:'));
    expect(moneyFact).toBeDefined();
    // Separator-agnostic: the digits round-trip to 650000 (no decimals)...
    expect(moneyFact!.replace(/\D/g, '')).toBe('650000');
    // ...and the value was *formatted* (currency symbol / grouping inserted),
    // not the raw number that the old buggy code emitted.
    expect(moneyFact).not.toBe('Value.amount: 650000');
  });

  it('guards undefined evidence values to an em dash', () => {
    const params = deriveFromEvidence(
      'elCaso',
      [
        {
          rule_id: 'single_bidder',
          ocid: 'ocds-abc-002',
          family: 'F1',
          severity: 'low',
          evidence: [{ field: 'tender.procurementMethodDetails', value: undefined }],
        },
      ],
      [],
      investigation,
    );
    const facts = params['facts'] as Array<{ text: string }>;
    expect(facts[0]!.text).toBe('Método de contratación: —');
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
