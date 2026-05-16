import { describe, it, expect } from 'vitest';
import './individual_large_contract.js';
import { ruleById, makeCtx } from '../__fixtures__/ctx.js';
import { makeRelease, makeBenchmark, makeEntityIndex } from '../__fixtures__/release.js';

const rule = ruleById('individual_large_contract');
const SUP = 'GT-NIT:7894880';

const bench = makeBenchmark({
  cohortStats: { individual: { p90: 100_000, count: 50 } },
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

describe('individual_large_contract (rule 12, F2)', () => {
  it('fires when individual supplier and value >= cohort p90 and >= 90k', () => {
    const entities = makeEntityIndex({ types: { [SUP]: 'individual' } });
    const out = rule.run(
      makeCtx({
        release: makeRelease({ awards: award(150_000) }),
        benchmarks: bench,
        entities,
      }),
    );
    expect(out).toHaveLength(1);
    expect(out[0]!.severity).toBe('medium');
  });

  it("treats 'unknown' entity type as individual (privacy-safe)", () => {
    const entities = makeEntityIndex({ types: { [SUP]: 'unknown' } });
    expect(
      rule.run(
        makeCtx({
          release: makeRelease({ awards: award(150_000) }),
          benchmarks: bench,
          entities,
        }),
      ),
    ).toHaveLength(1);
  });

  it('does NOT fire for a company supplier', () => {
    const entities = makeEntityIndex({ types: { [SUP]: 'company' } });
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

  it('does NOT fire below the cohort p90', () => {
    const entities = makeEntityIndex({ types: { [SUP]: 'individual' } });
    expect(
      rule.run(
        makeCtx({
          release: makeRelease({ awards: award(95_000) }),
          benchmarks: bench,
          entities,
        }),
      ),
    ).toHaveLength(0);
  });
});
