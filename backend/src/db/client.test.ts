import { describe, it, expect, afterEach, vi } from 'vitest';

// Mock mongodb before importing client
vi.mock('mongodb', () => {
  const mockDb = {};
  const mockClient = {
    db: vi.fn().mockReturnValue(mockDb),
    close: vi.fn().mockResolvedValue(undefined),
  };
  const MockMongoClient = vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue(mockClient),
    ...mockClient,
  }));
  return { MongoClient: MockMongoClient, Db: class {} };
});

// Set MONGODB_URI for config
process.env['MONGODB_URI'] = 'mongodb+srv://test:test@cluster.mongodb.net/db';

describe('getMongoClient() memoization', () => {
  afterEach(async () => {
    // Reset by calling closeMongo to clear the cached promise
    const { closeMongo } = await import('./client.js');
    await closeMongo();
  });

  it('returns the same Promise instance on repeated calls', async () => {
    const { getMongoClient } = await import('./client.js');
    const p1 = getMongoClient();
    const p2 = getMongoClient();
    expect(p1).toBe(p2);
  });
});
