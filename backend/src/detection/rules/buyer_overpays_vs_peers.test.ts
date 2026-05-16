import { describe, it, expect } from 'vitest';
import './buyer_overpays_vs_peers.js';
import { ruleById, makeCtx } from '../__fixtures__/ctx.js';
import { makeRelease, makeBenchmark, makeEntityIndex } from '../__fixtures__/release.js';

const rule = ruleById('buyer_overpays_vs_peers');
const BUYER = 'GT-NIT:4132726';

const bench = makeBenchmark({ peerCategoryMedian: { '8110': 100_000 } });

const entities = makeEntityIndex({
  rollups: {
    [BUYER]: {
      awardCount: 10,
      awardValue: 1,
      buyerIds: [],
      categoryFamilies: [],
      firstAwardDate: '',
      lastAwardDate: '',
      historyAvgValue: 0,
    },
  },
});

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

describe('buyer_overpays_vs_peers (rule 14, F3)', () => {
  it('fires when award >= 2x peer median and buyer has >= 5 awards', () => {
    const out = rule.run(
      makeCtx({
        release: makeRelease({ awards: award(250_000) }),
        benchmarks: bench,
        entities,
      }),
    );
    expect(out).toHaveLength(1);
    expect(out[0]!.severity).toBe('medium');
  });

  it('does NOT fire below the 2x peer multiple', () => {
    expect(
      rule.run(
        makeCtx({
          release: makeRelease({ awards: award(150_000) }),
          benchmarks: bench,
          entities,
        }),
      ),
    ).toHaveLength(0);
  });

  it('does NOT fire when the buyer has < 5 awards', () => {
    const few = makeEntityIndex({
      rollups: {
        [BUYER]: {
          awardCount: 2,
          awardValue: 1,
          buyerIds: [],
          categoryFamilies: [],
          firstAwardDate: '',
          lastAwardDate: '',
          historyAvgValue: 0,
        },
      },
    });
    expect(
      rule.run(
        makeCtx({
          release: makeRelease({ awards: award(250_000) }),
          benchmarks: bench,
          entities: few,
        }),
      ),
    ).toHaveLength(0);
  });
});
