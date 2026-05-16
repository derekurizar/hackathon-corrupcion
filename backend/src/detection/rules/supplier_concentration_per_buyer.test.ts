import { describe, it, expect } from 'vitest';
import './supplier_concentration_per_buyer.js';
import { ruleById, makeCtx } from '../__fixtures__/ctx.js';
import { makeRelease, makeEntityIndex } from '../__fixtures__/release.js';

const rule = ruleById('supplier_concentration_per_buyer');
const BUYER = 'GT-NIT:4132726';

function entitiesWith(share: number, total: number, count: number) {
  // Spread the non-top remainder across MANY small suppliers so the intended
  // top supplier is genuinely the largest even at low shares.
  const top = total * share;
  const rest = total - top;
  const small: Record<string, number> = {};
  for (let i = 0; i < 10; i++) small[`GT-NIT:s${i}`] = rest / 10;
  return makeEntityIndex({
    rollups: {
      [BUYER]: {
        awardCount: count,
        awardValue: total,
        buyerIds: [],
        categoryFamilies: [],
        firstAwardDate: '',
        lastAwardDate: '',
        historyAvgValue: total / Math.max(count, 1),
        supplierValueMap: { 'GT-NIT:7894880': top, ...small },
        supplierCountMap: { 'GT-NIT:7894880': count - 1, 'GT-NIT:s0': 1 },
      },
    },
  });
}

describe('supplier_concentration_per_buyer (rule 7, F2, HERO)', () => {
  it('fires medium at share 0.55', () => {
    const out = rule.run(
      makeCtx({
        release: makeRelease(),
        entities: entitiesWith(0.55, 2_000_000, 8),
      }),
    );
    expect(out).toHaveLength(1);
    expect(out[0]!.severity).toBe('medium');
    expect(out[0]!.secondaryEntityIds).toEqual(['GT-NIT:7894880']);
  });

  it('fires high at share >= 0.65', () => {
    const out = rule.run(
      makeCtx({
        release: makeRelease(),
        entities: entitiesWith(0.8, 2_000_000, 8),
      }),
    );
    expect(out[0]!.severity).toBe('high');
  });

  it('does NOT fire below the 1M total floor', () => {
    expect(
      rule.run(
        makeCtx({
          release: makeRelease(),
          entities: entitiesWith(0.9, 500_000, 8),
        }),
      ),
    ).toHaveLength(0);
  });

  it('does NOT fire below the 5-award floor', () => {
    expect(
      rule.run(
        makeCtx({
          release: makeRelease(),
          entities: entitiesWith(0.9, 2_000_000, 3),
        }),
      ),
    ).toHaveLength(0);
  });

  it('does NOT fire when share below 0.50', () => {
    expect(
      rule.run(
        makeCtx({
          release: makeRelease(),
          entities: entitiesWith(0.3, 2_000_000, 8),
        }),
      ),
    ).toHaveLength(0);
  });
});
