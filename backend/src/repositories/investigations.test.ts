import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { Investigation } from '../schema/index.js';

vi.mock('../db/collections.js', () => ({
  getCollection: vi.fn(),
}));

import { getCollection } from '../db/collections.js';
import {
  setInvestigationAudio,
  upsertInvestigationGuarded,
} from './investigations.js';

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

describe('setInvestigationAudio', () => {
  let mockUpdateOne: ReturnType<typeof vi.fn>;

  const audio = { es: '/audio/k/2/es.mp3', en: '/audio/k/2/en.mp3' };
  const cues = {
    es: [{ chapter: 'El caso', tSec: 0 }],
    en: [{ chapter: 'The case', tSec: 0 }],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateOne = vi.fn().mockResolvedValue({ matchedCount: 1 });
    (getCollection as ReturnType<typeof vi.fn>).mockResolvedValue({
      updateOne: mockUpdateOne,
    });
  });

  it('$sets audio + podcastCuePoints filtered on { _id, version } and returns matched', async () => {
    const result = await setInvestigationAudio('test-key', 2, audio, cues);
    expect(result).toEqual({ matched: true });
    expect(mockUpdateOne).toHaveBeenCalledTimes(1);
    expect(mockUpdateOne).toHaveBeenCalledWith(
      { _id: 'test-key', version: 2 },
      { $set: { audio, podcastCuePoints: cues } },
    );
  });

  it('returns { matched: false } on a version mismatch (still no extra $set)', async () => {
    mockUpdateOne.mockResolvedValueOnce({ matchedCount: 0 });
    const result = await setInvestigationAudio('test-key', 9, audio, cues);
    expect(result).toEqual({ matched: false });
    expect(mockUpdateOne).toHaveBeenCalledTimes(1);
    expect(mockUpdateOne).toHaveBeenCalledWith(
      { _id: 'test-key', version: 9 },
      { $set: { audio, podcastCuePoints: cues } },
    );
  });
});
