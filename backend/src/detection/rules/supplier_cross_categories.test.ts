import { describe, it, expect } from 'vitest';
import './supplier_cross_categories.js';
import { ruleById, makeCtx } from '../__fixtures__/ctx.js';
import { makeRelease, makeEntityIndex } from '../__fixtures__/release.js';

const rule = ruleById('supplier_cross_categories');
const SUP = 'GT-NIT:7894880';

function entities(families: string[], value: number) {
  return makeEntityIndex({
    rollups: {
      [SUP]: {
        awardCount: 10,
        awardValue: value,
        buyerIds: [],
        categoryFamilies: families,
        firstAwardDate: '',
        lastAwardDate: '',
        historyAvgValue: value / 10,
      },
    },
  });
}

describe('supplier_cross_categories (rule 9, F2)', () => {
  it('fires when supplier spans >= 4 families and total >= 500k', () => {
    const out = rule.run(
      makeCtx({
        release: makeRelease(),
        entities: entities(['8110', '4322', '7214', '9999'], 800_000),
      }),
    );
    expect(out).toHaveLength(1);
    expect(out[0]!.severity).toBe('medium');
  });

  it('does NOT fire with only 3 families', () => {
    expect(
      rule.run(
        makeCtx({
          release: makeRelease(),
          entities: entities(['8110', '4322', '7214'], 800_000),
        }),
      ),
    ).toHaveLength(0);
  });

  it('does NOT fire below the 500k total', () => {
    expect(
      rule.run(
        makeCtx({
          release: makeRelease(),
          entities: entities(['8110', '4322', '7214', '9999'], 100_000),
        }),
      ),
    ).toHaveLength(0);
  });
});
