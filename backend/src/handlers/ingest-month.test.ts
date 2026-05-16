import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the stage so the handler test is a pure routing test (no network/DB).
const ingestMonthMock = vi.fn();
vi.mock('../stages/ingest-month.js', () => ({
  ingestMonth: (...a: unknown[]) => ingestMonthMock(...a),
}));

import { handler } from './ingest-month.js';

describe('ingest-month Lambda handler', () => {
  beforeEach(() => {
    ingestMonthMock.mockReset();
  });

  it('routes the event {year,month} to ingestMonth and returns the count', async () => {
    ingestMonthMock.mockResolvedValue({ recordsIngested: 17426, runId: 'run-x' });
    const result = await handler(
      { year: 2026, month: 4 },
      {} as never,
      () => {},
    );
    expect(ingestMonthMock).toHaveBeenCalledWith({ year: 2026, month: 4 });
    // handler narrows the result to just recordsIngested
    expect(result).toEqual({ recordsIngested: 17426 });
  });

  it('propagates ingestMonth failures (no swallowing)', async () => {
    ingestMonthMock.mockRejectedValue(new Error('stream blew up'));
    await expect(
      handler({ year: 2026, month: 4 }, {} as never, () => {}),
    ).rejects.toThrow('stream blew up');
  });
});
