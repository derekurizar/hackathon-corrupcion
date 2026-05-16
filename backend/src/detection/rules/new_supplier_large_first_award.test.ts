import { describe, it, expect } from 'vitest';
import './new_supplier_large_first_award.js';
import { ruleById, makeCtx } from '../__fixtures__/ctx.js';
import { makeRelease, makeEntityIndex } from '../__fixtures__/release.js';

const rule = ruleById('new_supplier_large_first_award');
const SUP = 'GT-NIT:7894880';
const DATE = '2026-04-02T10:00:00-06:00';

const bigAward = [
  {
    id: 'a',
    date: DATE,
    status: 'active',
    statusDetails: 'Habilitado',
    value: { amount: 1_000_000, currency: 'GTQ' },
    supplierIds: ['GT-NIT-7894880'],
  },
];

describe('new_supplier_large_first_award (rule 11, F2)', () => {
  it('fires when supplier first (only) award in scope and >= 900k', () => {
    const entities = makeEntityIndex({
      rollups: {
        [SUP]: {
          awardCount: 1,
          awardValue: 1_000_000,
          buyerIds: [],
          categoryFamilies: [],
          firstAwardDate: DATE,
          lastAwardDate: DATE,
          historyAvgValue: 1_000_000,
        },
      },
    });
    const out = rule.run(makeCtx({ release: makeRelease({ awards: bigAward }), entities }));
    expect(out).toHaveLength(1);
    expect(out[0]!.severity).toBe('medium');
  });

  it('does NOT fire when supplier has prior awards', () => {
    const entities = makeEntityIndex({
      rollups: {
        [SUP]: {
          awardCount: 4,
          awardValue: 4_000_000,
          buyerIds: [],
          categoryFamilies: [],
          firstAwardDate: '2026-01-01T00:00:00-06:00',
          lastAwardDate: DATE,
          historyAvgValue: 1_000_000,
        },
      },
    });
    expect(
      rule.run(makeCtx({ release: makeRelease({ awards: bigAward }), entities })),
    ).toHaveLength(0);
  });

  it('does NOT fire below 900k', () => {
    const entities = makeEntityIndex({
      rollups: {
        [SUP]: {
          awardCount: 1,
          awardValue: 50000,
          buyerIds: [],
          categoryFamilies: [],
          firstAwardDate: DATE,
          lastAwardDate: DATE,
          historyAvgValue: 50000,
        },
      },
    });
    expect(rule.run(makeCtx({ release: makeRelease(), entities }))).toHaveLength(0);
  });
});
