import { describe, it, expect } from 'vitest';
import { withRetry } from './retry.js';

describe('withRetry', () => {
  it('returns immediately when fn succeeds first try', async () => {
    let calls = 0;
    const result = await withRetry(async () => {
      calls++;
      return 'ok';
    });
    expect(result).toBe('ok');
    expect(calls).toBe(1);
  });

  it('retries until the Nth attempt succeeds (fails N-1 times)', async () => {
    let calls = 0;
    const result = await withRetry(
      async () => {
        calls++;
        if (calls < 3) throw new Error(`transient ${calls}`);
        return 'recovered';
      },
      { retries: 3, baseMs: 1 },
    );
    expect(result).toBe('recovered');
    expect(calls).toBe(3);
  });

  it('rethrows with context after exhausting all attempts', async () => {
    let calls = 0;
    await expect(
      withRetry(
        async () => {
          calls++;
          throw new Error('mid-stream boom');
        },
        { retries: 2, baseMs: 1 },
      ),
    ).rejects.toThrow(/Failed after 3 attempts: mid-stream boom/);
    // retries:2 → 1 initial + 2 re-attempts = 3 total
    expect(calls).toBe(3);
  });

  it('includes non-Error throw values in the exhaustion message', async () => {
    await expect(
      withRetry(
        async () => {
          throw 'string failure';
        },
        { retries: 0, baseMs: 1 },
      ),
    ).rejects.toThrow(/Failed after 1 attempts: string failure/);
  });
});
