import { describe, it, expect } from 'vitest';
import './burst_clustering.js';
import { ruleById, makeCtx } from '../__fixtures__/ctx.js';
import { makeRelease, makeBenchmark } from '../__fixtures__/release.js';

const rule = ruleById('burst_clustering');
const BUYER = 'GT-NIT:4132726';

describe('burst_clustering (rule 19, F4)', () => {
  it('fires when peak weekly >= 3x median and >= 3 awards', () => {
    const bench = makeBenchmark({
      buyerWeeklyBaseline: {
        [BUYER]: { medianWeeklyAwardCount: 2, p75WeeklyAwardCount: 8 },
      },
    });
    const out = rule.run(makeCtx({ release: makeRelease(), benchmarks: bench }));
    expect(out).toHaveLength(1);
    expect(out[0]!.severity).toBe('medium');
  });

  it('does NOT fire when peak below the burst multiple', () => {
    const bench = makeBenchmark({
      buyerWeeklyBaseline: {
        [BUYER]: { medianWeeklyAwardCount: 4, p75WeeklyAwardCount: 5 },
      },
    });
    expect(
      rule.run(makeCtx({ release: makeRelease(), benchmarks: bench })),
    ).toHaveLength(0);
  });

  it('does NOT fire below the absolute award floor', () => {
    const bench = makeBenchmark({
      buyerWeeklyBaseline: {
        [BUYER]: { medianWeeklyAwardCount: 0.5, p75WeeklyAwardCount: 2 },
      },
    });
    expect(
      rule.run(makeCtx({ release: makeRelease(), benchmarks: bench })),
    ).toHaveLength(0);
  });

  it('does NOT fire when buyer has no weekly baseline', () => {
    expect(rule.run(makeCtx({ release: makeRelease() }))).toHaveLength(0);
  });
});
