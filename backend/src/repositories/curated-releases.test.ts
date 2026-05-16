import { describe, it, expect } from 'vitest';
import { shouldReplace } from './curated-releases.js';

describe('shouldReplace', () => {
  it('returns true when no stored doc (null)', () => {
    expect(shouldReplace({ date: '2026-01-01T00:00:00Z' }, null)).toBe(true);
  });
  it('returns true when no stored doc (undefined)', () => {
    expect(shouldReplace({ date: '2026-01-01T00:00:00Z' }, undefined)).toBe(true);
  });
  it('returns true when incoming is newer', () => {
    expect(
      shouldReplace({ date: '2026-02-01T00:00:00Z' }, { date: '2026-01-01T00:00:00Z' }),
    ).toBe(true);
  });
  it('returns true when dates are equal (keep latest = idempotent)', () => {
    expect(
      shouldReplace({ date: '2026-01-01T00:00:00Z' }, { date: '2026-01-01T00:00:00Z' }),
    ).toBe(true);
  });
  it('returns false when incoming is older', () => {
    expect(
      shouldReplace({ date: '2025-12-01T00:00:00Z' }, { date: '2026-01-01T00:00:00Z' }),
    ).toBe(false);
  });
});
