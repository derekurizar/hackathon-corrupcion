import { describe, it, expect } from 'vitest';
import type { Signal } from '../schema/index.js';
import type { SceneSignal, SceneEvidenceItem } from '../scene-contract/types.js';
import { parseRef, resolveRef } from '../scene-contract/refs.js';
import type { CaseBundle } from './rank.js';
import { buildUserBlock, buildSystemPrefix } from './prompt.js';
import type { DigestConfig } from './digest.js';

const CFG: DigestConfig = {
  samplePerRule: 6,
  maxRepresentative: 60,
  maxWorstComparisons: 5,
  maxTopSuppliers: 5,
};

function sig(over: Partial<Signal>): Signal {
  return {
    _id: over._id ?? 'sid',
    ocid: over.ocid ?? 'ocds-1',
    caseKey: over.caseKey ?? 'CK',
    rule_id: over.rule_id ?? 'single_bidder',
    family: over.family ?? 'F1',
    severity: over.severity ?? 'medium',
    confidence: over.confidence ?? 0.5,
    primaryEntityId: over.primaryEntityId ?? 'GT-NIT:buyer',
    secondaryEntityIds: over.secondaryEntityIds ?? ['GT-NIT:sup'],
    timeWindow: over.timeWindow ?? 'scope:2026-01..2026-01',
    title: over.title ?? 't',
    explanation: over.explanation ?? 'expl',
    story_angle: over.story_angle ?? 'angle',
    evidence: over.evidence ?? [{ field: 'awards[].value.amount', value: 100 }],
  };
}

function flatten(signals: Signal[]): Signal['evidence'] {
  const sorted = [...signals].sort((a, b) => {
    const byRule = a.rule_id.localeCompare(b.rule_id);
    return byRule !== 0 ? byRule : a.ocid.localeCompare(b.ocid);
  });
  const flat: Signal['evidence'] = [];
  for (const s of sorted) for (const e of s.evidence) flat.push(e);
  return flat;
}

function largeBundle(): CaseBundle {
  const signals: Signal[] = [];
  for (let i = 0; i < 200; i += 1) {
    signals.push(
      sig({
        _id: `sb-${i}`,
        ocid: `ocds-${String(i).padStart(4, '0')}`,
        evidence: [
          { field: 'tender.numberOfTenderers', value: 1, comparison: '<= 1' },
          {
            field: 'awards[].value.amount',
            value: 90000 + i,
            comparison: '>= 90000',
          },
        ],
      }),
    );
  }
  return {
    caseKey: 'CK',
    buyer: { id: 'GT-NIT:buyer', name: 'MINISTERIO X' },
    family: 'F1',
    scope: 'scope:2025-08..2026-07',
    signals,
    evidence: flatten(signals),
    entities: { supplierIds: ['GT-NIT:sup'] },
    firedRuleIds: ['single_bidder'],
    isLead: false,
  };
}

describe('buildUserBlock — compact digest', () => {
  it('huge case → bounded block with digest sections (not 10k lines)', () => {
    const bundle = largeBundle();
    expect(bundle.evidence.length).toBe(400); // 200 signals × 2 evidence

    const block = buildUserBlock(
      bundle,
      'un proveedor individual',
      'an individual supplier',
      'individual',
      CFG,
    );

    const lines = block.split('\n');
    expect(lines.length).toBeLessThan(80);
    expect(block).toContain('CASE DIGEST');
    expect(block).toContain('HEADLINE');
    expect(block).toContain('FIRED RULES (rollup)');
    expect(block).toContain('Use ONLY the facts provided here.');
    // headline value reuses rank.caseTotalValue (max = 90000+199)
    expect(block).toContain('totalValue: 90199');
  });

  it('every cited ev:<i> resolves against full server-side evidence', () => {
    const bundle = largeBundle();
    const block = buildUserBlock(bundle, 'es', 'en', 'company', CFG);

    const sceneSignals: SceneSignal[] = bundle.signals.map((s) => ({
      rule_id: s.rule_id,
      ocid: s.ocid,
      family: s.family,
      severity: s.severity,
      evidence: s.evidence.map((e) => ({
        field: e.field,
        value: e.value,
        ...(e.comparison !== undefined ? { comparison: e.comparison } : {}),
        ...(e.benchmark !== undefined ? { benchmark: e.benchmark } : {}),
      })),
    }));
    const sceneEvidence: SceneEvidenceItem[] = bundle.evidence.map((e) => ({
      field: e.field,
      value: e.value,
      ...(e.comparison !== undefined ? { comparison: e.comparison } : {}),
      ...(e.benchmark !== undefined ? { benchmark: e.benchmark } : {}),
    }));

    const evRefs = [...block.matchAll(/ev:(\d+)/g)].map((m) => Number.parseInt(m[1]!, 10));
    expect(evRefs.length).toBeGreaterThan(0);
    for (const idx of evRefs) {
      expect(idx).toBeLessThan(bundle.evidence.length);
      const parsed = parseRef(`ev:${idx}`);
      expect(parsed).not.toBeNull();
      const resolved = resolveRef(parsed!, sceneSignals, sceneEvidence);
      expect(resolved).toBeDefined();
      expect((resolved as { field: string }).field).toBe(bundle.evidence[idx]!.field);
    }
  });
});

describe('scene guidance', () => {
  it('system prefix carries the static SCENE CATALOG (cache-stable)', () => {
    const a = buildSystemPrefix();
    expect(a).toContain('SCENE CATALOG (static)');
    expect(a).toContain('MoneyFlowStreams (default)');
    expect(a).toContain('CoverHeadline');
    expect(a).toContain('[sigueElDinero]');
    // Must be identical across calls or prompt caching silently breaks.
    expect(buildSystemPrefix()).toBe(a);
  });

  it('user block lists per-case ALLOWED SCENES (gated by fired rules)', () => {
    // largeBundle fires only single_bidder (F1) with no benchmark → variants
    // like PriceBars must NOT be offered.
    const block = buildUserBlock(largeBundle(), 'es', 'en', 'company', CFG);
    expect(block).toContain('ALLOWED SCENES');
    expect(block).toContain('cover: CoverHeadline (default)');
    expect(block).toContain('sigueElDinero: MoneyFlowStreams (default)');
    expect(block).not.toContain('PriceBars');
  });
});
