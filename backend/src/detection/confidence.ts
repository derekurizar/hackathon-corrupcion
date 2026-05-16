/** Clamp a number into the closed unit interval [0, 1]. */
export function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

/**
 * Deterministic confidence (idea/03): `clamp01((metric − threshold) / scale)`.
 * `scale` is the per-rule saturation distance (configured in `RuleConfig`).
 * Guards against a non-positive `scale` (would divide by zero / invert).
 */
export function confidence(
  metric: number,
  threshold: number,
  scale: number,
): number {
  if (scale <= 0) return metric >= threshold ? 1 : 0;
  return clamp01((metric - threshold) / scale);
}
