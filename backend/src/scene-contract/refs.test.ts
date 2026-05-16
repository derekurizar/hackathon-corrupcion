import { describe, it, expect } from 'vitest';
import { parseRef, flattenCaseEvidence, resolveRef } from './refs.js';
import type { SceneSignal, SceneEvidenceItem } from './types.js';

describe('parseRef', () => {
  it('parses ev:<int>', () => {
    expect(parseRef('ev:0')).toEqual({ kind: 'ev', index: 0 });
    expect(parseRef('ev:42')).toEqual({ kind: 'ev', index: 42 });
  });
  it('parses sig:<rule_id> without path', () => {
    expect(parseRef('sig:supplier_concentration_per_buyer')).toEqual({
      kind: 'sig',
      ruleId: 'supplier_concentration_per_buyer',
    });
  });
  it('parses sig:<rule_id>.<path>', () => {
    expect(parseRef('sig:single_bidder.evidence')).toEqual({
      kind: 'sig',
      ruleId: 'single_bidder',
      path: 'evidence',
    });
    expect(parseRef('sig:single_bidder.evidence.0.value')).toEqual({
      kind: 'sig',
      ruleId: 'single_bidder',
      path: 'evidence.0.value',
    });
  });
  it('rejects malformed refs', () => {
    expect(parseRef('ev:')).toBeNull();
    expect(parseRef('ev:abc')).toBeNull();
    expect(parseRef('evidence:3')).toBeNull();
    expect(parseRef('sig:')).toBeNull();
    expect(parseRef('nope')).toBeNull();
    expect(parseRef('')).toBeNull();
  });
});

const sigA: SceneSignal = {
  rule_id: 'single_bidder',
  ocid: 'ocds-002',
  family: 'F1',
  severity: 'high',
  evidence: [
    { field: 'bidCounts.count', value: 1 },
    { field: 'awards.value.amount', value: 500000, comparison: '3x median' },
  ],
};
const sigB: SceneSignal = {
  rule_id: 'price_outlier_vs_category',
  ocid: 'ocds-001',
  family: 'F3',
  severity: 'medium',
  evidence: [{ field: 'family.median', value: 50000 }],
};
const caseEvidence: SceneEvidenceItem[] = [{ field: 'totalValue', value: 650000 }];

describe('flattenCaseEvidence — locked ordering', () => {
  it('sorts signals by (rule_id ASC, ocid ASC), evidence in array order, case evidence last', () => {
    // rule_id ASC: 'price_outlier_vs_category' < 'single_bidder', so sigB first.
    const flat = flattenCaseEvidence([sigB, sigA], caseEvidence);
    expect(flat.map((e) => e.field)).toEqual([
      'family.median',
      'bidCounts.count',
      'awards.value.amount',
      'totalValue',
    ]);
  });

  it('is stable under input signal order shuffle', () => {
    const a = flattenCaseEvidence([sigA, sigB], caseEvidence);
    const b = flattenCaseEvidence([sigB, sigA], caseEvidence);
    expect(a).toEqual(b);
  });

  it('tie-breaks equal rule_id by ocid ASC', () => {
    const s1: SceneSignal = { ...sigA, ocid: 'ocds-zzz', evidence: [{ field: 'z', value: 1 }] };
    const s2: SceneSignal = { ...sigA, ocid: 'ocds-aaa', evidence: [{ field: 'a', value: 2 }] };
    const flat = flattenCaseEvidence([s1, s2], []);
    expect(flat.map((e) => e.field)).toEqual(['a', 'z']);
  });
});

describe('resolveRef', () => {
  it('resolves ev:<i> to the i-th flattened evidence item', () => {
    // flat order: [family.median, bidCounts.count, awards.value.amount, totalValue]
    expect(resolveRef(parseRef('ev:0')!, [sigA, sigB], caseEvidence)).toEqual({
      field: 'family.median',
      value: 50000,
    });
    expect(resolveRef(parseRef('ev:2')!, [sigA, sigB], caseEvidence)).toEqual({
      field: 'awards.value.amount',
      value: 500000,
      comparison: '3x median',
    });
  });

  it('returns undefined for out-of-range ev index', () => {
    expect(resolveRef(parseRef('ev:99')!, [sigA], [])).toBeUndefined();
  });

  it('resolves sig:<id> to the signal evidence array', () => {
    expect(resolveRef(parseRef('sig:single_bidder')!, [sigA, sigB], [])).toEqual(
      sigA.evidence,
    );
  });

  it('resolves sig:<id>.<path> via dotted walk', () => {
    expect(
      resolveRef(parseRef('sig:single_bidder.evidence.0.value')!, [sigA], []),
    ).toBe(1);
    expect(
      resolveRef(parseRef('sig:single_bidder.severity')!, [sigA], []),
    ).toBe('high');
  });

  it('returns undefined for an unknown rule id or bad path', () => {
    expect(resolveRef(parseRef('sig:nope')!, [sigA], [])).toBeUndefined();
    expect(
      resolveRef(parseRef('sig:single_bidder.evidence.9.value')!, [sigA], []),
    ).toBeUndefined();
  });
});
