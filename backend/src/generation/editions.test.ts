import { describe, it, expect } from 'vitest';
import { buildEdition, bundleTotalValue } from './editions.js';
import type { CaseBundle } from './rank.js';

function bundle(over: Partial<CaseBundle>): CaseBundle {
  return {
    caseKey: over.caseKey ?? 'CK',
    buyer: over.buyer ?? { id: 'GT-NIT:1', name: 'Ministerio X' },
    family: over.family ?? 'F2',
    scope: over.scope ?? 'scope:2026-01..2026-01',
    signals: over.signals ?? [],
    evidence: over.evidence ?? [{ field: 'awardValue', value: 100 }],
    entities: over.entities ?? { supplierIds: [] },
    firedRuleIds: over.firedRuleIds ?? ['single_bidder'],
    isLead: over.isLead ?? false,
  };
}

describe('bundleTotalValue', () => {
  it('takes max money-hinted numeric evidence; 0 when none', () => {
    expect(
      bundleTotalValue(
        bundle({
          evidence: [
            { field: 'awardValue', value: 100 },
            { field: 'totalAmount', value: 500 },
            { field: 'numberOfTenderers', value: 9000 },
          ],
        }),
      ),
    ).toBe(500);
    expect(bundleTotalValue(bundle({ evidence: [{ field: 'count', value: 3 }] }))).toBe(0);
  });
});

describe('buildEdition', () => {
  it('lead = first bundle, highlights = next three, stats aggregated', () => {
    const bundles = [
      bundle({ caseKey: 'A', family: 'F2', evidence: [{ field: 'v', value: 100 }] }),
      bundle({ caseKey: 'B', family: 'F1', evidence: [{ field: 'value', value: 200 }] }),
      bundle({ caseKey: 'C', family: 'F1', evidence: [{ field: 'value', value: 300 }] }),
      bundle({ caseKey: 'D', family: 'F4', evidence: [{ field: 'value', value: 400 }] }),
      bundle({ caseKey: 'E', family: 'F4', evidence: [{ field: 'value', value: 500 }] }),
    ];
    const ed = buildEdition('run-123', '2026-05-16T00:00:00.000Z', bundles);
    expect(ed._id).toBe('run-123');
    expect(ed.leadCaseKey).toBe('A');
    expect(ed.highlightCaseKeys).toEqual(['B', 'C', 'D']);
    expect(ed.stats.count).toBe(5);
    // 'v' does not contain 'value'/'amount' → 0 for A
    expect(ed.stats.totalValueFlagged).toBe(0 + 200 + 300 + 400 + 500);
    expect(ed.stats.byFamily).toEqual({ F1: 2, F2: 1, F3: 0, F4: 2 });
  });

  it('empty bundles → empty lead/highlights, zero stats', () => {
    const ed = buildEdition('run-x', '2026-05-16T00:00:00.000Z', []);
    expect(ed.leadCaseKey).toBe('');
    expect(ed.highlightCaseKeys).toEqual([]);
    expect(ed.stats.count).toBe(0);
    expect(ed.stats.totalValueFlagged).toBe(0);
  });
});
