import { describe, it, expect } from 'vitest';
import './contract_splitting.js';
import { ruleById, makeCtx } from '../__fixtures__/ctx.js';
import { makeRelease, makeBenchmark } from '../__fixtures__/release.js';

const rule = ruleById('contract_splitting');

const cluster = {
  buyerId: 'GT-NIT:4132726',
  canonicalSupplierId: 'GT-NIT:7894880',
  family: '8110',
  ocids: ['ocds-test-0001', 'ocds-test-0002', 'ocds-test-0003'],
  dates: ['2026-04-01T00:00:00-06:00', '2026-04-10T00:00:00-06:00', '2026-04-20T00:00:00-06:00'],
  amounts: [40_000, 45_000, 30_000],
  clusterSum: 115_000,
};

describe('contract_splitting (rule 18, F4, HIGH)', () => {
  it('fires high when this release belongs to a precomputed cluster', () => {
    const bench = makeBenchmark({ splittingClusters: [cluster] });
    const out = rule.run(makeCtx({ release: makeRelease(), benchmarks: bench }));
    expect(out).toHaveLength(1);
    expect(out[0]!.severity).toBe('high');
  });

  it('does NOT fire when the release is not in any cluster', () => {
    const bench = makeBenchmark({
      splittingClusters: [{ ...cluster, ocids: ['ocds-other-1', 'ocds-other-2', 'ocds-other-3'] }],
    });
    expect(rule.run(makeCtx({ release: makeRelease(), benchmarks: bench }))).toHaveLength(0);
  });

  it('does NOT fire when an award in the cluster is >= per-award max', () => {
    const bench = makeBenchmark({
      splittingClusters: [{ ...cluster, amounts: [40_000, 95_000, 30_000] }],
    });
    expect(rule.run(makeCtx({ release: makeRelease(), benchmarks: bench }))).toHaveLength(0);
  });
});
