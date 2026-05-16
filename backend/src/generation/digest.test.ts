import { describe, it, expect } from 'vitest';
import type { Signal } from '../schema/index.js';
import type { CaseBundle } from './rank.js';
import { buildCaseDigest, renderDigestBlock, type DigestConfig } from './digest.js';

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
    severity: over.severity ?? 'low',
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

/** Replicates rank.flattenEvidence so bundle.evidence matches the ev indices. */
function flatten(signals: Signal[]): Signal['evidence'] {
  const sorted = [...signals].sort((a, b) => {
    const byRule = a.rule_id.localeCompare(b.rule_id);
    return byRule !== 0 ? byRule : a.ocid.localeCompare(b.ocid);
  });
  const flat: Signal['evidence'] = [];
  for (const s of sorted) for (const e of s.evidence) flat.push(e);
  return flat;
}

function bundleOf(signals: Signal[]): CaseBundle {
  return {
    caseKey: 'CK',
    buyer: { id: 'GT-NIT:buyer', name: 'MINISTERIO X' },
    family: 'F1',
    scope: 'scope:2025-08..2026-07',
    signals,
    evidence: flatten(signals),
    entities: {
      supplierIds: [...new Set(signals.flatMap((s) => s.secondaryEntityIds))],
    },
    firedRuleIds: [...new Set(signals.map((s) => s.rule_id))],
    isLead: false,
  };
}

/** A large multi-rule case: single_bidder fires many times + a concentration. */
function largeBundle(): CaseBundle {
  const signals: Signal[] = [];
  for (let i = 0; i < 50; i += 1) {
    signals.push(
      sig({
        _id: `sb-${i}`,
        rule_id: 'single_bidder',
        ocid: `ocds-${String(i).padStart(3, '0')}`,
        severity: i % 5 === 0 ? 'high' : 'medium',
        confidence: 0.4 + (i % 10) / 100,
        evidence: [
          { field: 'tender.numberOfTenderers', value: 1, comparison: '<= 1' },
          {
            field: 'awards[].value.amount',
            value: 100000 + i * 1000,
            comparison: '>= 90000',
          },
          { field: 'awards[].date', value: `2025-09-${(i % 28) + 1}` },
        ],
      }),
    );
  }
  signals.push(
    sig({
      _id: 'conc-1',
      rule_id: 'supplier_concentration_per_buyer',
      ocid: 'ocds-conc',
      family: 'F2',
      severity: 'high',
      confidence: 0.93,
      secondaryEntityIds: ['GT-NIT:771'],
      evidence: [
        {
          field: 'awards[].supplierIds',
          value: 'GT-NIT:771',
          comparison: 'top-supplier value-share 0.842 >= 0.6',
          benchmark: { topValue: 40500000, total: 48100000, share: 0.842 },
        },
        {
          field: 'awards[].value.amount',
          value: 48213900,
          comparison: 'buyer total >= 5000000',
        },
      ],
    }),
  );
  return bundleOf(signals);
}

describe('buildCaseDigest — determinism', () => {
  it('same bundle (and shuffled input) → byte-identical digest + render', () => {
    const a = largeBundle();
    const shuffled = [...a.signals].reverse();
    const b = bundleOf(shuffled);

    const da = buildCaseDigest(a, CFG);
    const db = buildCaseDigest(b, CFG);
    expect(JSON.stringify(da)).toBe(JSON.stringify(db));
    expect(renderDigestBlock(da)).toBe(renderDigestBlock(db));
    // Idempotent on a second pass.
    expect(JSON.stringify(buildCaseDigest(a, CFG))).toBe(JSON.stringify(da));
  });
});

describe('buildCaseDigest — ev-index preservation', () => {
  it('every sample/worstComparison ev resolves to the full bundle.evidence', () => {
    const bundle = largeBundle();
    const d = buildCaseDigest(bundle, CFG);

    const check = (ev: number, field: string, value: unknown): void => {
      expect(ev).toBeGreaterThanOrEqual(0);
      expect(ev).toBeLessThan(bundle.evidence.length);
      const target = bundle.evidence[ev]!;
      expect(target.field).toBe(field);
      expect(target.value).toEqual(value);
    };

    for (const r of d.rules) {
      for (const s of r.sample) check(s.ev, s.field, s.value);
    }
    for (const w of d.headline.worstComparisons) {
      const target = bundle.evidence[w.ev]!;
      expect(target.field).toBe(w.field);
    }
  });
});

describe('buildCaseDigest — ranking & rollups', () => {
  it('per-rule sample sorted by value desc then ev asc; rollups correct', () => {
    const bundle = largeBundle();
    const d = buildCaseDigest(bundle, CFG);

    const sb = d.rules.find((r) => r.ruleId === 'single_bidder')!;
    expect(sb.signalCount).toBe(50);
    expect(sb.distinctContracts).toBe(50);
    expect(sb.severityCounts.high).toBe(10); // i % 5 === 0 → 0,5,...,45
    expect(sb.severityCounts.medium).toBe(40);
    // representative = max award amount (i=49 → 149000)
    expect(sb.representativeValue).toBe(149000);
    // sample money values strictly non-increasing
    const vals = sb.sample.map((e) => e.value).filter((v): v is number => typeof v === 'number');
    for (let i = 1; i < vals.length; i += 1) {
      expect(vals[i]!).toBeLessThanOrEqual(vals[i - 1]!);
    }
    // rules sorted ruleId ASC
    expect(d.rules.map((r) => r.ruleId)).toEqual(
      [...d.rules.map((r) => r.ruleId)].sort((x, y) => x.localeCompare(y)),
    );
  });

  it('worstComparisons ranked by metric desc (share 0.842 wins)', () => {
    const d = buildCaseDigest(largeBundle(), CFG);
    expect(d.headline.worstComparisons.length).toBeGreaterThan(0);
    const top = d.headline.worstComparisons[0]!;
    expect(top.ruleId).toBe('supplier_concentration_per_buyer');
    expect(top.metric).toBe(0.842);
  });

  it('topSuppliers by signal count desc then id asc', () => {
    const d = buildCaseDigest(largeBundle(), CFG);
    // 50 single_bidder signals → GT-NIT:sup; 1 concentration → GT-NIT:771
    expect(d.headline.topSuppliers[0]).toEqual({
      id: 'GT-NIT:sup',
      signalCount: 50,
    });
  });
});

describe('buildCaseDigest — caps', () => {
  it('samplePerRule + maxRepresentative honored; truncation flagged', () => {
    const d = buildCaseDigest(largeBundle(), { ...CFG, samplePerRule: 3 });
    for (const r of d.rules) expect(r.sample.length).toBeLessThanOrEqual(3);
    expect(d.sampleTruncated).toBe(true);

    const capped = buildCaseDigest(largeBundle(), {
      ...CFG,
      maxRepresentative: 2,
    });
    const total = capped.rules.reduce((n, r) => n + r.sample.length, 0);
    expect(total).toBeLessThanOrEqual(2);
  });
});

describe('buildCaseDigest — edges', () => {
  it('no money / no dates / empty signals degrade gracefully', () => {
    const empty = bundleOf([]);
    const d0 = buildCaseDigest(empty, CFG);
    expect(d0.headline.totalValue).toBe(0);
    expect(d0.headline.dateRange).toBeNull();
    expect(d0.rules).toEqual([]);
    expect(renderDigestBlock(d0)).toContain('FIRED RULES (rollup)\n- (none)');

    const noMoney = bundleOf([sig({ evidence: [{ field: 'tender.title', value: 'x' }] })]);
    const d1 = buildCaseDigest(noMoney, CFG);
    expect(d1.headline.totalValue).toBe(0);
    expect(d1.rules[0]!.representativeValue).toBe(0);
  });

  it('tiny case still produces a readable digest (sample = all items)', () => {
    const tiny = bundleOf([sig({ evidence: [{ field: 'awards[].value.amount', value: 500 }] })]);
    const d = buildCaseDigest(tiny, CFG);
    expect(d.rules).toHaveLength(1);
    expect(d.rules[0]!.sample).toHaveLength(1);
    expect(renderDigestBlock(d)).toContain('ev:0');
  });
});
