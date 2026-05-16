import { describe, it, expect } from 'vitest';
import { clamp01, confidence } from './confidence.js';

describe('clamp01', () => {
  it('clamps below 0 and above 1', () => {
    expect(clamp01(-3)).toBe(0);
    expect(clamp01(0)).toBe(0);
    expect(clamp01(0.42)).toBe(0.42);
    expect(clamp01(1)).toBe(1);
    expect(clamp01(7)).toBe(1);
  });
});

describe('confidence = clamp01((metric - threshold) / scale)', () => {
  it('is 0 at the threshold', () => {
    expect(confidence(100, 100, 50)).toBe(0);
  });
  it('is 1 at threshold + scale', () => {
    expect(confidence(150, 100, 50)).toBe(1);
  });
  it('is linear in between', () => {
    expect(confidence(125, 100, 50)).toBeCloseTo(0.5, 10);
  });
  it('clamps to [0,1]', () => {
    expect(confidence(50, 100, 50)).toBe(0);
    expect(confidence(1000, 100, 50)).toBe(1);
  });
  it('degenerate scale <= 0 → step function', () => {
    expect(confidence(100, 100, 0)).toBe(1);
    expect(confidence(99, 100, 0)).toBe(0);
    expect(confidence(101, 100, -1)).toBe(1);
  });
});
