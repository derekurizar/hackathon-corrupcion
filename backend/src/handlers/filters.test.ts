import { describe, it, expect, vi } from 'vitest';

const getDistinctFilterValuesMock = vi.fn();
const getInvestigationValueBoundsMock = vi.fn();
vi.mock('../repositories/index.js', () => ({
  getDistinctFilterValues: (...a: unknown[]) =>
    getDistinctFilterValuesMock(...a),
  getInvestigationValueBounds: (...a: unknown[]) =>
    getInvestigationValueBoundsMock(...a),
}));

import { handler } from './filters.js';

// Mocks reset in-body (not `beforeEach`) — see stats.test.ts note.
describe('filters handler', () => {
  it('200 with fixed families/priorities + mocked buyers and bounds', async () => {
    getDistinctFilterValuesMock.mockReset();
    getInvestigationValueBoundsMock.mockReset();
    getDistinctFilterValuesMock.mockResolvedValue({
      families: ['F1'],
      priorities: ['high'],
      buyers: [{ id: 'b1', name: 'Buyer One' }],
    });
    getInvestigationValueBoundsMock.mockResolvedValue({ min: 100, max: 9000 });

    const r = await handler({} as never);
    expect(r).toMatchObject({ statusCode: 200 });
    const body = JSON.parse((r as { body: string }).body);
    expect(body.families).toEqual(['F1', 'F2', 'F3', 'F4']);
    expect(body.priorities).toEqual(['high', 'medium', 'low']);
    expect(body.buyers).toEqual([{ id: 'b1', name: 'Buyer One' }]);
    expect(body.valueBounds).toEqual({ min: 100, max: 9000 });
  });

  it('500 when a repo throws (no internal leak)', async () => {
    getDistinctFilterValuesMock.mockReset();
    getInvestigationValueBoundsMock.mockReset();
    getDistinctFilterValuesMock.mockImplementation(() => {
      throw new Error('secret.db.host unreachable');
    });
    getInvestigationValueBoundsMock.mockResolvedValue({ min: 0, max: 0 });
    const r = await handler({} as never);
    expect(r).toMatchObject({ statusCode: 500 });
    expect((r as { body: string }).body).not.toMatch(/secret\.db\.host/);
  });
});
