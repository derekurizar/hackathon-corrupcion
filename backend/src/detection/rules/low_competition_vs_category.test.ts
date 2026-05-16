import { describe, it, expect } from 'vitest';
import './low_competition_vs_category.js';
import { ruleById, makeCtx } from '../__fixtures__/ctx.js';
import { makeRelease, makeBenchmark } from '../__fixtures__/release.js';

const rule = ruleById('low_competition_vs_category');

const bench = makeBenchmark({
  categoryPrice: {
    '8110': {
      median: 100,
      p25: 50,
      p75: 150,
      count: 20,
      level: 'family',
      tendererCountP25: 4,
    },
  },
});

describe('low_competition_vs_category (rule 2, F1)', () => {
  it('fires when tenderers < family p25 and <= 2', () => {
    const r = makeRelease({
      tender: { ...makeRelease().tender, numberOfTenderers: 1 },
    });
    const out = rule.run(makeCtx({ release: r, benchmarks: bench }));
    expect(out).toHaveLength(1);
    expect(out[0]!.severity).toBe('medium');
  });

  it('does NOT fire when sample below CATEGORY_MIN_SAMPLE', () => {
    const small = makeBenchmark({
      categoryPrice: {
        '8110': {
          median: 100,
          p25: 50,
          p75: 150,
          count: 3,
          level: 'family',
          tendererCountP25: 4,
        },
      },
    });
    const r = makeRelease({
      tender: { ...makeRelease().tender, numberOfTenderers: 1 },
    });
    expect(rule.run(makeCtx({ release: r, benchmarks: small }))).toHaveLength(0);
  });

  it('does NOT fire when tenderers >= p25', () => {
    const r = makeRelease({
      tender: { ...makeRelease().tender, numberOfTenderers: 4 },
    });
    expect(rule.run(makeCtx({ release: r, benchmarks: bench }))).toHaveLength(0);
  });
});
