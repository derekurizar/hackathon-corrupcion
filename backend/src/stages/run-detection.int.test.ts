import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import { makeRelease } from '../detection/__fixtures__/release.js';

/**
 * Env-gated detection integration test (requires `MONGODB_URI`). Seeds a
 * single-bidder high-value release + a benchmark for the scope, runs
 * `runDetection` twice, and asserts (a) core rules fire and (b) the re-run
 * yields identical signal counts (idempotent delete-by-scope + reinsert).
 * Skipped without Atlas.
 */
const hasAtlas = !!process.env['MONGODB_URI'];
const TAG = `int-detect-${Date.now()}`;
const OCID = `ocds-${TAG}`;
const SCOPE = 'scope:2026-04..2026-04';

describe.skipIf(!hasAtlas)('runDetection (Atlas)', () => {
  beforeAll(async () => {
    const { getCollection } = await import('../db/collections.js');
    const cr = await getCollection('curatedReleases');
    const r = makeRelease({
      ocid: OCID,
      id: `${OCID}-id`,
      buyer: { id: `GT-NIT-d${TAG}`, name: 'INT DETECT BUYER' },
      tender: { ...makeRelease().tender, numberOfTenderers: 1 },
      awards: [
        {
          id: `${OCID}-a`,
          date: '2026-04-02T10:00:00-06:00',
          status: 'active',
          statusDetails: 'Habilitado',
          value: { amount: 1_500_000, currency: 'GTQ' },
          supplierIds: [`GT-NIT-ds${TAG}`],
        },
      ],
    });
    await cr.replaceOne({ ocid: OCID } as never, r as never, { upsert: true });

    const bm = await getCollection('benchmarks');
    const { BenchmarkSchema } = await import('../schema/benchmarks.js');
    const doc = BenchmarkSchema.parse({
      _id: SCOPE,
      periodScope: { minMonth: '2026-04', maxMonth: '2026-04' },
      categoryPrice: {},
      peerCategoryMedian: {},
      buyerMethodMix: {},
      nationalMethodBaseline: {},
      cohortStats: { individual: { p90: 0, count: 0 } },
      buyerWeeklyBaseline: {},
      splittingClusters: [],
      failedThenAwardIndex: {},
      repeatWinnerIndex: {},
    });
    await bm.replaceOne({ _id: SCOPE } as never, doc as never, { upsert: true });
  });

  afterAll(async () => {
    const { getCollection } = await import('../db/collections.js');
    const { closeMongo } = await import('../db/client.js');
    const cr = await getCollection('curatedReleases');
    await cr.deleteOne({ ocid: OCID } as never);
    const sig = await getCollection('signals');
    await sig.deleteMany({ ocid: OCID } as never);
    const bm = await getCollection('benchmarks');
    await bm.deleteOne({ _id: SCOPE } as never);
    const runs = await getCollection('pipelineRuns');
    await runs.deleteMany({ 'toggles.detection': true } as never);
    await closeMongo();
  });

  it('fires core rules and is idempotent across re-runs', async () => {
    const { runDetection } = await import('./run-detection.js');
    const { getSignalsByOcid } = await import('../repositories/signals.js');

    const first = await runDetection({ scope: SCOPE });
    const sig1 = await getSignalsByOcid(OCID);
    const ids1 = new Set(sig1.map((s) => s.rule_id));
    // single_bidder (1) + highvalue_noncompetitive_method (4) fire here.
    expect(ids1.has('single_bidder')).toBe(true);
    expect(ids1.has('highvalue_noncompetitive_method')).toBe(true);
    expect(first.signals).toBeGreaterThan(0);

    const second = await runDetection({ scope: SCOPE });
    const sig2 = await getSignalsByOcid(OCID);
    expect(sig2.length).toBe(sig1.length);
    expect(second.signals).toBe(first.signals);
    expect(new Set(sig2.map((s) => s._id))).toEqual(
      new Set(sig1.map((s) => s._id)),
    );
  });
});
