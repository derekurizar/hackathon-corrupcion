import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Edition } from '../schema/index.js';

const getCurrentEditionMock = vi.fn();
vi.mock('../repositories/index.js', () => ({
  getCurrentEdition: (...a: unknown[]) => getCurrentEditionMock(...a),
}));

import { handler } from './editions.js';

const edition: Edition = {
  _id: 'edition-2026-05',
  publishedAt: '2026-05-16T00:00:00Z',
  leadCaseKey: 'case-1',
  highlightCaseKeys: ['case-1', 'case-2'],
  stats: {
    count: 2,
    totalValueFlagged: 1000,
    byFamily: { F1: 1, F2: 1, F3: 0, F4: 0 },
  },
};

describe('editions handler', () => {
  beforeEach(() => getCurrentEditionMock.mockReset());

  it('200 with an EditionDTO (has id, no _id)', async () => {
    getCurrentEditionMock.mockResolvedValue(edition);
    const r = await handler({} as never);
    expect(r).toMatchObject({ statusCode: 200 });
    const body = JSON.parse((r as { body: string }).body);
    expect(body.id).toBe('edition-2026-05');
    expect('_id' in body).toBe(false);
    expect(body.leadCaseKey).toBe('case-1');
  });

  it('404 when there is no current edition', async () => {
    getCurrentEditionMock.mockResolvedValue(null);
    const r = await handler({} as never);
    expect(r).toMatchObject({ statusCode: 404 });
    expect(JSON.parse((r as { body: string }).body).error.code).toBe(404);
  });
});
