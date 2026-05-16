import type { CuratedRelease } from '../schema/curated-release.js';
import type { ContractSignal } from './types.js';

/** Parse an ISO-ish date string to epoch ms; NaN-safe (`null` on failure). */
export function parseDateMs(s: string | null | undefined): number | null {
  if (!s) return null;
  const t = Date.parse(s);
  return Number.isNaN(t) ? null : t;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Whole/fractional day difference `a − b` (ms parsed); `null` if unparseable. */
export function daysBetween(
  a: string | null | undefined,
  b: string | null | undefined,
): number | null {
  const am = parseDateMs(a);
  const bm = parseDateMs(b);
  if (am === null || bm === null) return null;
  return (am - bm) / MS_PER_DAY;
}

/** Sorted-copy exact percentile (linear interpolation). `[]` → 0. */
export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 1) return sorted[0]!;
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo]!;
  const frac = idx - lo;
  return sorted[lo]! * (1 - frac) + sorted[hi]! * frac;
}

export function median(values: number[]): number {
  return percentile(values, 50);
}

/** The single active award value (if exactly the first award; else 0). */
export function firstAwardAmount(release: CuratedRelease): number {
  return release.awards[0]?.value.amount ?? 0;
}

/**
 * Builds a `ContractSignal` with placeholder `signal_id`/`timeWindow`/
 * `caseKey` — the orchestrator overwrites these with scope-bound deterministic
 * values before persistence.
 */
export function makeSignal(
  args: Omit<ContractSignal, 'signal_id' | 'timeWindow' | 'caseKey'>,
): ContractSignal {
  return {
    ...args,
    signal_id: '',
    timeWindow: '',
    caseKey: '',
  };
}
