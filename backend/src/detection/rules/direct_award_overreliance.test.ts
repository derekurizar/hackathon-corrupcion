import { describe, it, expect } from 'vitest';
import './direct_award_overreliance.js';
import { ruleById, makeCtx } from '../__fixtures__/ctx.js';
import {
  makeRelease,
  makeBenchmark,
  makeEntityIndex,
} from '../__fixtures__/release.js';
// makeBenchmark used for both module-level bench and the full-share variant.

const rule = ruleById('direct_award_overreliance');
const BUYER = 'GT-NIT:4132726';

const bench = makeBenchmark({
  buyerMethodMix: {
    [BUYER]: {
      'Compra Directa con Oferta Electrónica (Art. 43 LCE Inciso b)': {
        valueShare: 0.99,
        countShare: 0.99,
      },
    },
  },
});

describe('direct_award_overreliance (rule 3, F1)', () => {
  it('fires medium when direct value-share >= 0.98 (<1.0), value >= 1M, >= 5 awards', () => {
    const entities = makeEntityIndex({
      rollups: {
        [BUYER]: {
          awardCount: 10,
          awardValue: 2_000_000,
          buyerIds: [],
          categoryFamilies: ['8110'],
          firstAwardDate: '',
          lastAwardDate: '',
          historyAvgValue: 200000,
        },
      },
    });
    const out = rule.run(
      makeCtx({ release: makeRelease(), benchmarks: bench, entities }),
    );
    expect(out).toHaveLength(1);
    expect(out[0]!.severity).toBe('medium'); // share 0.99 < 1.0 → medium
  });

  it('fires high when direct value-share is exactly 1.0', () => {
    const fullBench = makeBenchmark({
      buyerMethodMix: {
        [BUYER]: {
          'Compra Directa con Oferta Electrónica (Art. 43 LCE Inciso b)': {
            valueShare: 1,
            countShare: 1,
          },
        },
      },
    });
    const entities = makeEntityIndex({
      rollups: {
        [BUYER]: {
          awardCount: 10,
          awardValue: 2_000_000,
          buyerIds: [],
          categoryFamilies: [],
          firstAwardDate: '',
          lastAwardDate: '',
          historyAvgValue: 200000,
        },
      },
    });
    expect(
      rule.run(
        makeCtx({ release: makeRelease(), benchmarks: fullBench, entities }),
      )[0]!.severity,
    ).toBe('high');
  });

  it('does NOT fire below the award-count floor', () => {
    const entities = makeEntityIndex({
      rollups: {
        [BUYER]: {
          awardCount: 2,
          awardValue: 2_000_000,
          buyerIds: [],
          categoryFamilies: [],
          firstAwardDate: '',
          lastAwardDate: '',
          historyAvgValue: 1_000_000,
        },
      },
    });
    expect(
      rule.run(makeCtx({ release: makeRelease(), benchmarks: bench, entities })),
    ).toHaveLength(0);
  });

  it('does NOT fire when buyer has no method mix', () => {
    expect(
      rule.run(makeCtx({ release: makeRelease() })),
    ).toHaveLength(0);
  });
});
