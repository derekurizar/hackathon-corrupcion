import { describe, it, expect } from 'vitest';
import type { Signal } from '../schema/index.js';
import { boundPersistedEvidence, boundCaseSignals } from './publish.js';

function sig(over: Partial<Signal>): Signal {
  return {
    _id: over._id ?? 'sid',
    ocid: over.ocid ?? 'ocds-1',
    caseKey: 'CK',
    rule_id: over.rule_id ?? 'single_bidder',
    family: over.family ?? 'F1',
    severity: over.severity ?? 'low',
    confidence: over.confidence ?? 0.5,
    primaryEntityId: 'GT-NIT:b',
    secondaryEntityIds: ['GT-NIT:s'],
    timeWindow: 'scope:2026-01..2026-01',
    title: 't',
    explanation: 'e',
    story_angle: 'a',
    evidence: over.evidence ?? [{ field: 'awards[].value.amount', value: 1 }],
  };
}

const ev = (n: number): { field: string; value: number }[] =>
  Array.from({ length: n }, (_, i) => ({ field: 'awards[].value.amount', value: i }));

describe('boundPersistedEvidence', () => {
  it('short evidence is returned untouched', () => {
    const e = ev(50);
    const r = boundPersistedEvidence(e, {}, 300);
    expect(r.evidence).toBe(e);
    expect(r.cap).toBe(300);
  });

  it('huge evidence with no refs → sliced to the floor (prefix, stable indices)', () => {
    const e = ev(60_000);
    const r = boundPersistedEvidence(e, {}, 300);
    expect(r.evidence).toHaveLength(300);
    expect(r.cap).toBe(300);
    // Prefix: indices unchanged so ev:<i> stays stable.
    for (let i = 0; i < 300; i += 1) expect(r.evidence[i]).toBe(e[i]);
  });

  it('grows the cap so a deep scenePlan ev:<i> still resolves', () => {
    const e = ev(60_000);
    const scenePlan = {
      sigueElDinero: {
        sceneId: 'MoneyFlowStreams',
        params: { facts: [{ value: 1, valueRef: 'ev:1200' }] },
        source: 'fallback',
      },
    };
    const r = boundPersistedEvidence(e, scenePlan, 300);
    expect(r.cap).toBe(1201); // maxRef 1200 + 1
    expect(r.evidence).toHaveLength(1201);
    expect(r.evidence[1200]).toBe(e[1200]); // the referenced item is present
  });

  it('refs below the floor do not shrink the prefix', () => {
    const r = boundPersistedEvidence(
      ev(60_000),
      {
        cover: { sceneId: 'CoverHeadline', params: { ref: 'ev:5' } },
      },
      300,
    );
    expect(r.cap).toBe(300);
    expect(r.evidence).toHaveLength(300);
  });
});

describe('boundCaseSignals', () => {
  it('keeps every fired rule_id (scene shortlist unchanged) under the cap', () => {
    const signals: Signal[] = [];
    for (let i = 0; i < 5000; i += 1)
      signals.push(sig({ _id: `sb${i}`, ocid: `o${i}`, rule_id: 'single_bidder' }));
    for (let i = 0; i < 30; i += 1)
      signals.push(sig({ _id: `cs${i}`, ocid: `c${i}`, rule_id: 'contract_splitting' }));
    const out = boundCaseSignals(signals, 8);
    expect(out.length).toBe(16); // 8 per rule × 2 rules
    expect(new Set(out.map((s) => s.rule_id))).toEqual(
      new Set(['single_bidder', 'contract_splitting']),
    );
  });

  it('keeps the top-by-value signals (totalValue preserved)', () => {
    const signals = [
      sig({ _id: 'lo', ocid: 'a', evidence: [{ field: 'awards[].value.amount', value: 10 }] }),
      sig({
        _id: 'hi',
        ocid: 'b',
        evidence: [{ field: 'awards[].value.amount', value: 9_000_000 }],
      }),
      sig({ _id: 'mid', ocid: 'c', evidence: [{ field: 'awards[].value.amount', value: 500 }] }),
    ];
    const out = boundCaseSignals(signals, 1);
    expect(out).toHaveLength(1);
    expect(out[0]!._id).toBe('hi');
  });

  it('retains a benchmark-bearing signal even if low value', () => {
    const signals = [
      sig({
        _id: 'big',
        ocid: 'a',
        evidence: [{ field: 'awards[].value.amount', value: 9_000_000 }],
      }),
      sig({
        _id: 'bench',
        ocid: 'b',
        evidence: [
          { field: 'awards[].supplierIds', value: 'x', comparison: 's', benchmark: { share: 0.9 } },
        ],
      }),
    ];
    const out = boundCaseSignals(signals, 1);
    expect(out.some((s) => s._id === 'bench')).toBe(true);
  });

  it('is deterministic regardless of input order', () => {
    const a = [
      sig({ _id: '1', ocid: 'a', evidence: [{ field: 'awards[].value.amount', value: 5 }] }),
      sig({ _id: '2', ocid: 'b', evidence: [{ field: 'awards[].value.amount', value: 9 }] }),
    ];
    const out1 = boundCaseSignals(a, 5);
    const out2 = boundCaseSignals([...a].reverse(), 5);
    expect(out1.map((s) => s._id)).toEqual(out2.map((s) => s._id));
  });
});
