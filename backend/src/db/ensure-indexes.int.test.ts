import { describe, it, expect, afterAll } from 'vitest';
import { getDb, closeMongo } from './client.js';
import { ensureIndexes } from './ensure-indexes.js';

const hasAtlas = !!process.env['MONGODB_URI'];

describe.skipIf(!hasAtlas)('ensureIndexes integration', () => {
  afterAll(async () => {
    await closeMongo();
  });

  // ensureIndexes() issues ~22 sequential createIndex round-trips to Atlas;
  // running it twice (~44 round-trips) far exceeds Vitest's default 5s test
  // timeout over a remote cluster, so these Atlas-touching tests get explicit
  // generous timeouts. This is a network-latency allowance, not slow code.
  it(
    'runs twice without error (idempotent)',
    async () => {
      await ensureIndexes();
      await ensureIndexes(); // second call must not throw
    },
    60_000,
  );

  it(
    'curatedReleases has ocid unique index',
    async () => {
      const db = await getDb();
      const indexes = await db.collection('curatedReleases').indexes();
      const ocidIdx = indexes.find((i) => i.key?.['ocid'] === 1);
      expect(ocidIdx).toBeDefined();
      expect(ocidIdx?.unique).toBe(true);
    },
    20_000,
  );

  it(
    'investigations has a text index',
    async () => {
      const db = await getDb();
      const indexes = await db.collection('investigations').indexes();
      const textIdx = indexes.find((i) => Object.values(i.key ?? {}).includes('text'));
      expect(textIdx).toBeDefined();
    },
    20_000,
  );
});
