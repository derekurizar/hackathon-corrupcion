/**
 * Pure WCAG 2.x contrast-ratio utilities (no DOM).
 * Used by the dev token preview to flag accent/red as large-text-only.
 */

/** Parse `#RGB` or `#RRGGBB` into 0–255 channel triple. */
export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '').trim();
  const full =
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h;
  if (full.length !== 6 || /[^0-9a-fA-F]/.test(full)) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  const num = parseInt(full, 16);
  return [(num >> 16) & 0xff, (num >> 8) & 0xff, num & 0xff];
}

/** WCAG relative luminance of an sRGB color. */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two hex colors (1–21). */
export function contrastRatio(fg: string, bg: string): number {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** WCAG AA pass classification for a given pair. */
export function wcagLevel(
  fg: string,
  bg: string,
): { ratio: number; normalAA: boolean; largeAA: boolean } {
  const ratio = contrastRatio(fg, bg);
  return {
    ratio,
    normalAA: ratio >= 4.5,
    largeAA: ratio >= 3.0,
  };
}
