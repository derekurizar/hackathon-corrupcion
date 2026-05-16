/**
 * Locale-aware integer formatting for animated counters. ES uses `es-GT`
 * grouping, EN `en-US`; both render tabular lining figures via the
 * `.numeric-tabular` class so digits don't jitter mid count-up.
 */
export function formatInt(value: number, lang: string): string {
  const locale = lang.startsWith('es') ? 'es-GT' : 'en-US';
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(
    Number.isFinite(value) ? Math.round(value) : 0,
  );
}

/** Share fraction (0–1) → "NN%". */
export function formatShare(share: number): string {
  const pct = Number.isFinite(share) ? share * 100 : 0;
  return `${Math.round(pct)}%`;
}
