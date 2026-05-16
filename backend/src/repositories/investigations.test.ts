import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { Investigation } from '../schema/index.js';

vi.mock('../db/collections.js', () => ({
  getCollection: vi.fn(),
}));

import { getCollection } from '../db/collections.js';
import { upsertInvestigationGuarded } from './investigations.js';

/** Minimal Investigation stub — only `_id`/`evidenceHash` matter for dedup. */
const inv = (id: string, evidenceHash: string): Investigation =>
  ({ _id: id, evidenceHash }) as unknown as Investigation;

describe('upsertInvestigationGuarded', () => {
  let mockReplaceOne: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockReplaceOne = vi.fn().mockResolvedValue({});
    (getCollection as ReturnType<typeof vi.fn>).mockResolvedValue({
      replaceOne: mockReplaceOne,
    });
  });

  it('(a) skips the write when existingHash equals doc.evidenceHash', async () => {
    const doc = inv('test-key', 'abc');
    const result = await upsertInvestigationGuarded(doc, 'abc');
    expect(result).toEqual({ skipped: true });
    expect(getCollection).not.toHaveBeenCalled();
    expect(mockReplaceOne).not.toHaveBeenCalled();
  });

  it('(b) writes when existingHash differs from doc.evidenceHash', async () => {
    const doc = inv('test-key', 'new-hash');
    const result = await upsertInvestigationGuarded(doc, 'old-hash');
    expect(result).toEqual({ skipped: false });
    expect(mockReplaceOne).toHaveBeenCalledTimes(1);
  });

  it('(c) writes when existingHash is undefined', async () => {
    const doc = inv('test-key', 'abc');
    const result = await upsertInvestigationGuarded(doc);
    expect(result).toEqual({ skipped: false });
    expect(mockReplaceOne).toHaveBeenCalledTimes(1);
  });
});
