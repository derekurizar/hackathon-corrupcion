import { describe, it, expect } from 'vitest';
import './above_supplier_history_avg.js';
import { ruleById, makeCtx } from '../__fixtures__/ctx.js';
import { makeRelease, makeEntityIndex } from '../__fixtures__/release.js';

const rule = ruleById('above_supplier_history_avg');
const SUP = 'GT-NIT:7894880';

function entities(avg: number, count: number) {
  return makeEntityIndex({
    rollups: {
      [SUP]: {
        awardCount: count,
        awardValue: avg * count,
        buyerIds: [],
        categoryFamilies: [],
        firstAwardDate: '',
        lastAwardDate: '',
        historyAvgValue: avg,
      },
    },
  });
}

const award = (amount: number) => [
  {
    id: 'a',
    date: '2026-04-02T10:00:00-06:00',
    status: 'active',
    statusDetails: 'Habilitado',
    value: { amount, currency: 'GTQ' },
    supplierIds: ['GT-NIT-7894880'],
  },
];

describe('above_supplier_history_avg (rule 16, F3)', () => {
  it('fires at >= 3x supplier history avg with >= 3 prior awards', () => {
    const out = rule.run(
      makeCtx({
        release: makeRelease({ awards: award(300_000) }),
        entities: entities(50_000, 5),
      }),
    );
    expect(out).toHaveLength(1);
    expect(out[0]!.severity).toBe('medium');
  });

  it('does NOT fire below 3x', () => {
    expect(
      rule.run(
        makeCtx({
          release: makeRelease({ awards: award(100_000) }),
          entities: entities(50_000, 5),
        }),
      ),
    ).toHaveLength(0);
  });

  it('does NOT fire with too few prior awards', () => {
    expect(
      rule.run(
        makeCtx({
          release: makeRelease({ awards: award(300_000) }),
          entities: entities(50_000, 2),
        }),
      ),
    ).toHaveLength(0);
  });
});
