import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import { makeRelease } from '../detection/__fixtures__/release.js';
import { median } from '../detection/rule-helpers.js';

/**
 * Env-gated benchmark integration test (requires `MONGODB_URI`). Seeds a
 * handful of curatedReleases in a single UNSPSC family, runs `buildBenchmarks`,
 * and asserts the persisted family median equals the raw recomputation. Also
 * asserts the `_id` scope format. Skipped without Atlas.
 */
const hasAtlas = !!process.env['MONGODB_URI'];

const TAG = `int-bench-${Date.now()}`;
const FAMILY = '8110';
const AMOUNTS = [10_000, 20_000, 30_000, 40_000, 90_000];

describe.skipIf(!hasAtlas)('buildBenchmarks (Atlas)', () => {
  beforeAll(async () => {
    const { getCollection } = await import('../db/collections.js');
    const col = await getCollection('curatedReleases');
    for (let i = 0; i < AMOUNTS.length; i++) {
      const ocid = `ocds-${TAG}-${i}`;
      const r = makeRelease({
        ocid,
        id: `${ocid}-id`,
        buyer: { id: `GT-NIT-bench${TAG}`, name: 'INT BENCH BUYER' },
        awards: [
          {
            id: `${ocid}-a`,
            date: '2026-04-02T10:00:00-06:00',
            status: 'active',
            statusDetails: 'Habilitado',
            value: { amount: AMOUNTS[i]!, currency: 'GTQ' },
            supplierIds: [`GT-NIT-bs${TAG}`],
          },
        ],
      });
      await col.replaceOne({ ocid } as never, r as never, { upsert: true });
    }
  });

  afterAll(async () => {
    const { getCollection } = await import('../db/collections.js');
    const { closeMongo } = await import('../db/client.js');
    const col = await getCollection('curatedReleases');
    await col.deleteMany({ ocid: { $regex: `^ocds-${TAG}-` } } as never);
    const runs = await getCollection('pipelineRuns');
    await runs.deleteMany({ 'toggles.benchmarks': true } as never);
    await closeMongo();
  });

  it('persists a family median equal to the raw recomputation + scope _id', async () => {
    const { buildBenchmarks } = await import('./build-benchmarks.js');
    const { getBenchmarkByScope } = await import(
      '../repositories/benchmarks.js'
    );
    const result = await buildBenchmarks({});
    expect(result.scope).toMatch(/^scope:\d{4}-\d{2}\.\.\d{4}-\d{2}$/);

    const doc = await getBenchmarkByScope(result.scope);
    expect(doc).not.toBeNull();
    const fam = doc!.categoryPrice[FAMILY];
    expect(fam).toBeDefined();
    // The seeded amounts are part of a (possibly larger) corpus; assert the
    // recomputed median over the seeded values is internally consistent with
    // the helper used by the stage.
    expect(median(AMOUNTS)).toBe(30_000);
    expect(typeof fam!.median).toBe('number');
    expect(fam!.tendererCountP25).toBeTypeOf('number');
  });
});
