import { describe, expect, it } from 'vitest';
import { PACING, computeDwellMs } from './usePresentationPlayback';

const words = (n: number) => Array.from({ length: n }, () => 'word').join(' ');

describe('computeDwellMs', () => {
  it('grows with word count (within the un-clamped band)', () => {
    const few = computeDwellMs(words(10), { reducedMotion: false });
    const many = computeDwellMs(words(25), { reducedMotion: false });
    expect(many).toBeGreaterThan(few);
    // sanity: neither hit a clamp, so the relation reflects real reading time
    expect(few).toBeGreaterThan(PACING.MIN_DWELL_MS);
    expect(many).toBeLessThan(PACING.MAX_DWELL_MS);
  });

  it('clamps empty / whitespace-only text to the minimum dwell', () => {
    expect(computeDwellMs('', { reducedMotion: false })).toBe(
      PACING.MIN_DWELL_MS,
    );
    expect(computeDwellMs('   \n  ', { reducedMotion: false })).toBe(
      PACING.MIN_DWELL_MS,
    );
  });

  it('clamps very long text to the maximum dwell', () => {
    expect(computeDwellMs(words(2000), { reducedMotion: false })).toBe(
      PACING.MAX_DWELL_MS,
    );
  });

  it('reduced motion shortens the dwell for identical mid-length text', () => {
    const normal = computeDwellMs(words(20), { reducedMotion: false });
    const reduced = computeDwellMs(words(20), { reducedMotion: true });
    expect(reduced).toBeLessThan(normal);
    expect(normal - reduced).toBe(
      PACING.ANIM_BUDGET_MS - PACING.ANIM_BUDGET_REDUCED_MS,
    );
  });
});
