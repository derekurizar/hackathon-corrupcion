import { describe, it, expect, afterAll } from 'vitest';
import { closeMongo } from '../db/client.js';
import { getCollection } from '../db/collections.js';
import { upsertEntity } from './entities.js';
import { startRun, markStage, setCounts, finishRun } from './pipeline-runs.js';
import { upsertEdition, getCurrentEdition } from './editions.js';
import { getDistinctFilterValues } from './investigations.js';
import type { Entity, Edition } from '../schema/index.js';

const hasAtlas = !!process.env['MONGODB_URI'];
const TAG = `int-${Date.now()}`;

describe.skipIf(!hasAtlas)('repositories integration', () => {
  afterAll(async () => {
    // Best-effort cleanup of the docs this suite created
    const ent = await getCollection('entities');
    await ent.deleteOne({ _id: `GT-NIT:${TAG}` } as never);
    const ed = await getCollection('editions');
    await ed.deleteOne({ _id: `edition-${TAG}` } as never);
    const inv = await getCollection('investigations');
    await inv.deleteOne({ _id: `inv-a-${TAG}` } as never);
    await inv.deleteOne({ _id: `inv-b-${TAG}` } as never);
    await closeMongo();
  });

  // First repo call triggers the Atlas connect; allow for remote latency.
  it('upsertEntity sets scalars but never overwrites rollup on re-upsert', async () => {
    const id = `GT-NIT:${TAG}`;
    const seededRollup: Entity['rollup'] = {
      awardCount: 5,
      awardValue: 999,
      buyerIds: ['GT-NIT:buyer'],
      categoryFamilies: ['8110'],
      firstAwardDate: '2025-01-01T00:00:00Z',
      lastAwardDate: '2026-01-01T00:00:00Z',
      historyAvgValue: 199.8,
    };
    await upsertEntity({
      _id: id,
      name: 'FIRST NAME S.A.',
      kind: 'supplier',
      entityType: 'company',
      rollup: seededRollup,
    });
    // Re-upsert with a different name and NO rollup — rollup must remain seeded
    await upsertEntity({
      _id: id,
      name: 'SECOND NAME S.A.',
      kind: 'supplier',
      entityType: 'company',
    });
    const col = await getCollection('entities');
    const stored = (await col.findOne({ _id: id } as never)) as Entity | null;
    expect(stored?.name).toBe('SECOND NAME S.A.');
    expect(stored?.rollup.awardCount).toBe(5);
    expect(stored?.rollup.awardValue).toBe(999);
  }, 20_000);

  it('pipeline run lifecycle: start → markStage → setCounts → finish', async () => {
    const runId = await startRun({
      months: [{ year: 2026, month: 2 }],
      toggles: { ingest: true },
    });
    await markStage(runId, 'ingest', 'done');
    await setCounts(runId, { recordsIngested: 42, signals: 7, investigations: 3 });
    await finishRun(runId);

    const col = await getCollection('pipelineRuns');
    const run = await col.findOne({ _id: runId } as never);
    expect(run?.stages['ingest']).toBe('done');
    expect(run?.counts.recordsIngested).toBe(42);
    expect(run?.finishedAt).toBeTypeOf('string');

    await col.deleteOne({ _id: runId } as never);
  }, 20_000);

  it('editions getCurrentEdition returns the most recently published', async () => {
    const doc: Edition = {
      _id: `edition-${TAG}`,
      publishedAt: new Date().toISOString(),
      leadCaseKey: 'lead',
      highlightCaseKeys: ['lead'],
      stats: {
        count: 1,
        totalValueFlagged: 100,
        byFamily: { F1: 1, F2: 0, F3: 0, F4: 0 },
      },
    };
    await upsertEdition(doc);
    const current = await getCurrentEdition();
    expect(current).not.toBeNull();
    const isCurrent =
      current?._id === doc._id || (current !== null && current.publishedAt >= doc.publishedAt);
    expect(isCurrent).toBe(true);
  }, 20_000);

  it('getDistinctFilterValues pairs each buyer id with its own name', async () => {
    // Sort order of ids ("z..." < none) is intentionally the inverse of the
    // sort order of names, so a position-zip would mismatch id<->name.
    const col = await getCollection('investigations');
    const idA = `zbuyer-a-${TAG}`;
    const idB = `abuyer-b-${TAG}`;
    await col.replaceOne(
      { _id: `inv-a-${TAG}` } as never,
      { _id: `inv-a-${TAG}`, buyer: { id: idA, name: 'Alpha Ministry' } } as never,
      { upsert: true },
    );
    await col.replaceOne(
      { _id: `inv-b-${TAG}` } as never,
      { _id: `inv-b-${TAG}`, buyer: { id: idB, name: 'Zeta Agency' } } as never,
      { upsert: true },
    );

    const { buyers } = await getDistinctFilterValues();
    const byId = new Map(buyers.map((b) => [b.id, b.name]));
    expect(byId.get(idA)).toBe('Alpha Ministry');
    expect(byId.get(idB)).toBe('Zeta Agency');
  }, 20_000);
});
