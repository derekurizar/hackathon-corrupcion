import { describe, it, expect } from 'vitest';
import './buyer_dependence_on_supplier.js';
import { ruleById, makeCtx } from '../__fixtures__/ctx.js';
import { makeRelease, makeEntityIndex } from '../__fixtures__/release.js';

const rule = ruleById('buyer_dependence_on_supplier');
const BUYER = 'GT-NIT:4132726';

function entities(topCount: number, total: number) {
  // Spread the remaining count over many suppliers so the intended supplier
  // is the genuine top even when its share is small.
  const rest = total - topCount;
  const map: Record<string, number> = { 'GT-NIT:7894880': topCount };
  for (let i = 0; i < rest; i++) map[`GT-NIT:s${i}`] = 1;
  return makeEntityIndex({
    rollups: {
      [BUYER]: {
        awardCount: total,
        awardValue: 1,
        buyerIds: [],
        categoryFamilies: [],
        firstAwardDate: '',
        lastAwardDate: '',
        historyAvgValue: 0,
        supplierValueMap: {},
        supplierCountMap: map,
      },
    },
  });
}

describe('buyer_dependence_on_supplier (rule 8, F2)', () => {
  it('fires medium at count-share 0.55', () => {
    const out = rule.run(makeCtx({ release: makeRelease(), entities: entities(11, 20) }));
    expect(out).toHaveLength(1);
    expect(out[0]!.severity).toBe('medium');
  });

  it('fires high at count-share >= 0.65', () => {
    const out = rule.run(makeCtx({ release: makeRelease(), entities: entities(15, 20) }));
    expect(out[0]!.severity).toBe('high');
  });

  it('does NOT fire below the award-count floor', () => {
    expect(rule.run(makeCtx({ release: makeRelease(), entities: entities(3, 4) }))).toHaveLength(0);
  });

  it('does NOT fire when share below threshold', () => {
    expect(rule.run(makeCtx({ release: makeRelease(), entities: entities(2, 20) }))).toHaveLength(
      0,
    );
  });
});
