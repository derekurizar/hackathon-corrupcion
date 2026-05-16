import { describe, it, expect, vi, afterAll } from 'vitest';
import type { GuatecomprasRecord } from '../ocds/index.js';
import { compiledReleaseFixture } from '../ingest/__fixtures__/compiled-release.js';

/**
 * Env-gated idempotency integration test. Mocks ONLY the network boundary
 * (`downloadMonth` + `streamRecords`) so the real Area 03 guarded keep-latest
 * upsert + Mongo are exercised. Requires `MONGODB_URI` (Atlas) — skipped
 * otherwise. There is NO Guatecompras network dependency here.
 */
const hasAtlas = !!process.env['MONGODB_URI'];

// Mutable record list the mocked stream replays.
let streamPayload: GuatecomprasRecord[] = [];

vi.mock('../ingest/fetch.js', () => ({
  downloadMonth: vi.fn(async () => '/tmp/mock-gc.zip'),
  monthlyUrl: (y: number, m: number) => `mock://${y}/${m}`,
}));
vi.mock('../ingest/stream.js', () => ({
  streamRecords: async function* () {
    for (const r of streamPayload) yield r;
  },
}));

const TAG = `int-ingest-${Date.now()}`;
const OCID = `ocds-test-${TAG}`;

describe.skipIf(!hasAtlas)('ingestMonth idempotency (Atlas)', () => {
  afterAll(async () => {
    const { getCollection } = await import('../db/collections.js');
    const { closeMongo } = await import('../db/client.js');
    const cr = await getCollection('curatedReleases');
    await cr.deleteOne({ ocid: OCID } as never);
    const runs = await getCollection('pipelineRuns');
    await runs.deleteMany({ monthsRequested: { $elemMatch: { year: 2099 } } } as never);
    const ent = await getCollection('entities');
    await ent.deleteOne({ _id: 'GT-NIT:int7894880' } as never);
    await ent.deleteOne({ _id: 'GT-NIT:int4132726' } as never);
    await closeMongo();
  });

  function recordWith(date: string): GuatecomprasRecord {
    const base = compiledReleaseFixture;
    return {
      ...base,
      ocid: OCID,
      compiledRelease: {
        ...base.compiledRelease,
        ocid: OCID,
        date,
        parties: [
          {
            identifier: { scheme: 'GT-NIT', id: 'int4132726' },
            address: {
              streetAddress: 'x',
              locality: 'x',
              region: 'ALTA VERAPAZ',
              countryName: 'GUATEMALA',
            },
            roles: ['buyer'],
            id: 'GT-NIT-int4132726',
            name: 'BUYER INT',
          },
          {
            identifier: { scheme: 'GT-NIT', id: 'int7894880' },
            roles: ['supplier'],
            details: { legalEntityTypeDetail: { id: '2', description: 'SOCIEDAD ANÓNIMA' } },
            id: 'GT-NIT-int7894880',
            name: 'SUPPLIER INT S.A.',
          },
        ],
        buyer: { id: 'GT-NIT-int4132726', name: 'BUYER INT' },
      },
    };
  }

  it('re-ingesting an older snapshot keeps the newer state (no dups)', async () => {
    const { ingestMonth } = await import('./ingest-month.js');
    const { getByOcid } = await import('../repositories/curated-releases.js');
    const { getCollection } = await import('../db/collections.js');

    // Newer snapshot first.
    streamPayload = [recordWith('2099-06-15T12:00:00-06:00')];
    const r1 = await ingestMonth({ year: 2099, month: 6 });
    expect(r1.recordsIngested).toBe(1);

    // Then an OLDER overlapping ocid — guarded upsert must NOT overwrite.
    streamPayload = [recordWith('2099-05-01T12:00:00-06:00')];
    const r2 = await ingestMonth({ year: 2099, month: 5 });
    expect(r2.recordsIngested).toBe(1);

    const stored = await getByOcid(OCID);
    expect(stored?.date).toBe('2099-06-15T12:00:00-06:00'); // newer won

    // No duplicates by ocid.
    const col = await getCollection('curatedReleases');
    const dupCount = await col.countDocuments({ ocid: OCID } as never);
    expect(dupCount).toBe(1);
  }, 30_000);

  it('dry-run streams + counts but performs no DB writes', async () => {
    const { ingestMonth } = await import('./ingest-month.js');
    const { getCollection } = await import('../db/collections.js');

    const dryOcid = `${OCID}-dry`;
    streamPayload = [
      {
        ...recordWith('2099-07-01T12:00:00-06:00'),
        ocid: dryOcid,
        compiledRelease: {
          ...recordWith('2099-07-01T12:00:00-06:00').compiledRelease,
          ocid: dryOcid,
        },
      },
    ];
    const res = await ingestMonth({ year: 2099, month: 7, dryRun: true });
    expect(res.recordsIngested).toBe(1);
    expect(res.runId).toBeUndefined();

    const col = await getCollection('curatedReleases');
    const written = await col.countDocuments({ ocid: dryOcid } as never);
    expect(written).toBe(0);
  }, 30_000);
});
