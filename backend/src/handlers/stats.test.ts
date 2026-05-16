import { describe, it, expect, vi } from 'vitest';
import type { DashboardStats } from '../schema/index.js';

const getCurrentDashboardStatsMock = vi.fn();
vi.mock('../repositories/index.js', () => ({
  getCurrentDashboardStats: (...a: unknown[]) =>
    getCurrentDashboardStatsMock(...a),
}));

import { handler } from './stats.js';

const statsDoc: DashboardStats = {
  _id: 'current',
  computedAt: '2026-05-16T00:00:00Z',
  counters: {
    records: 10,
    valueAnalyzed: 1000,
    entities: 5,
    monthsCovered: 12,
    investigations: 3,
  },
  methodBreakdown: { open: 0.5 },
  byFamily: { F1: 1, F2: 1, F3: 1, F4: 0 },
  priorityDist: { high: 1, medium: 1, low: 1 },
  trend: [{ month: '2026-05', flagged: 3, value: 1000 }],
  topBuyersByFlaggedValue: [{ id: 'b1', name: 'Buyer', value: 500 }],
};

// NOTE: mocks are reset at the top of each test body, NOT in `beforeEach`.
// In this Vitest version, a `beforeEach` hook that touches a mock whose
// recorded result is an error (throw or rejection) surfaces that error as a
// suite-level failure even though the handler correctly catches it. Resetting
// in-body avoids the hook/mock interaction (verified). See dev summary.
describe('stats handler', () => {
  it('200 with public stats shape (no _id)', async () => {
    getCurrentDashboardStatsMock.mockReset();
    getCurrentDashboardStatsMock.mockResolvedValue(statsDoc);
    const r = await handler({} as never);
    expect(r).toMatchObject({ statusCode: 200 });
    const body = JSON.parse((r as { body: string }).body);
    expect('_id' in body).toBe(false);
    expect(body.counters.records).toBe(10);
  });

  it('500 with error envelope when no stats doc', async () => {
    getCurrentDashboardStatsMock.mockReset();
    getCurrentDashboardStatsMock.mockResolvedValue(null);
    const r = await handler({} as never);
    expect(r).toMatchObject({ statusCode: 500 });
    expect(JSON.parse((r as { body: string }).body).error.code).toBe(500);
  });

  it('500 with no internal leak when repo throws', async () => {
    getCurrentDashboardStatsMock.mockReset();
    getCurrentDashboardStatsMock.mockImplementation(() => {
      throw new Error('mongo connection refused at internal.host');
    });
    const r = await handler({} as never);
    expect(r).toMatchObject({ statusCode: 500 });
    expect((r as { body: string }).body).not.toMatch(/internal\.host/);
  });
});
