import { describe, it, expect } from 'vitest';
import './price_outlier_vs_category.js';
import { ruleById, makeCtx } from '../__fixtures__/ctx.js';
import { makeRelease, makeBenchmark } from '../__fixtures__/release.js';

const rule = ruleById('price_outlier_vs_category');

const bench = makeBenchmark({
  categoryPrice: {
    '8110': {
      median: 100_000,
      p25: 80_000,
      p75: 120_000,
      count: 30,
      level: 'family',
      tendererCountP25: 2,
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

describe('price_outlier_vs_category (rule 13, F3)', () => {
  it('fires medium at >= 3x median', () => {
    const out = rule.run(
      makeCtx({
        release: makeRelease({ awards: award(350_000) }),
        benchmarks: bench,
      }),
    );
    expect(out).toHaveLength(1);
    expect(out[0]!.severity).toBe('medium');
  });

  it('fires high at >= 5x median', () => {
    const out = rule.run(
      makeCtx({
        release: makeRelease({ awards: award(600_000) }),
        benchmarks: bench,
      }),
    );
    expect(out[0]!.severity).toBe('high');
  });

  it('fires on the IQR ceiling even below 3x median', () => {
    // p75 + 1.5*IQR = 120k + 1.5*40k = 180k. 200k > 180k but only 2x median.
    const out = rule.run(
      makeCtx({
        release: makeRelease({ awards: award(200_000) }),
        benchmarks: bench,
      }),
    );
    expect(out).toHaveLength(1);
    expect(out[0]!.severity).toBe('medium');
  });

  it('does NOT fire for an in-range price', () => {
    expect(
      rule.run(
        makeCtx({
          release: makeRelease({ awards: award(110_000) }),
          benchmarks: bench,
        }),
      ),
    ).toHaveLength(0);
  });

  it('does NOT fire when the family sample is too small', () => {
    const small = makeBenchmark({
      categoryPrice: {
        '8110': {
          median: 100_000,
          p25: 80_000,
          p75: 120_000,
          count: 2,
          level: 'family',
          tendererCountP25: 2,
        },
      },
    });
    expect(
      rule.run(
        makeCtx({
          release: makeRelease({ awards: award(600_000) }),
          benchmarks: small,
        }),
      ),
    ).toHaveLength(0);
  });
});
