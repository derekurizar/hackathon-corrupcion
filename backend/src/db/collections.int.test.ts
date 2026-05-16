import { describe, it, expect, afterAll } from 'vitest';
import { getMongoClient, closeMongo } from './client.js';
import { getCollection, COLLECTIONS } from './collections.js';

const hasAtlas = !!process.env['MONGODB_URI'];

describe.skipIf(!hasAtlas)('collections integration', () => {
  afterAll(async () => {
    await closeMongo();
  });

  // First accessor triggers the Atlas connect; allow for remote latency.
  it('every collection accessor returns a usable Collection', async () => {
    for (const name of COLLECTIONS) {
      const col = await getCollection(name);
      expect(col.collectionName).toBe(name);
    }
  }, 20_000);

  it('two getMongoClient() calls return the same instance', async () => {
    const p1 = getMongoClient();
    const p2 = getMongoClient();
    expect(p1).toBe(p2);
  });
});
