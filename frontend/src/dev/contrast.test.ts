import { describe, expect, it } from 'vitest';
import { contrastRatio, hexToRgb, wcagLevel } from './contrast';

const BG_BASE = '#0A0A0B';
const TEXT_HI = '#F5F5F5';
const ACCENT_RED = '#E10600';

describe('hexToRgb', () => {
  it('parses 6-digit hex', () => {
    expect(hexToRgb('#0A0A0B')).toEqual([10, 10, 11]);
  });
  it('expands 3-digit shorthand', () => {
    expect(hexToRgb('#fff')).toEqual([255, 255, 255]);
  });
  it('throws on invalid hex', () => {
    expect(() => hexToRgb('#zzz')).toThrow();
  });
});

describe('contrastRatio — palette guarantees', () => {
  // Acceptance criterion is the RANGE (the design-token guarantee), not a
  // point estimate. The dev-plan's "~18.8 / ~4.09" are loose hints; the
  // canonical WCAG 2.x relative-luminance formula yields ~18.15 and ~3.98
  // for these exact hex pairs (matches WebAIM). The bounds below encode the
  // real guarantee: text/hi clears normal-text AA; accent/red is large-only.
  it('text/hi on bg/base clears AA for normal text (ratio >= 18.0, well above 7:1 AAA)', () => {
    const ratio = contrastRatio(TEXT_HI, BG_BASE);
    expect(ratio).toBeGreaterThanOrEqual(18.0);
    expect(ratio).toBeLessThan(19.0);
    expect(ratio).toBeCloseTo(18.15, 1);
    expect(wcagLevel(TEXT_HI, BG_BASE).normalAA).toBe(true);
  });

  it('accent/red on bg/base is large-text-only (>= 3.0 but < 4.5)', () => {
    const ratio = contrastRatio(ACCENT_RED, BG_BASE);
    expect(ratio).toBeGreaterThanOrEqual(3.0);
    expect(ratio).toBeLessThan(4.5);
    expect(ratio).toBeCloseTo(3.98, 1);
    const level = wcagLevel(ACCENT_RED, BG_BASE);
    expect(level.largeAA).toBe(true);
    expect(level.normalAA).toBe(false);
  });

  it('is symmetric in argument order', () => {
    expect(contrastRatio(TEXT_HI, BG_BASE)).toBeCloseTo(contrastRatio(BG_BASE, TEXT_HI), 10);
  });
});
