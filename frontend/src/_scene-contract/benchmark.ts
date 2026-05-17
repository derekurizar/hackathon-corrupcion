/**
 * Benchmark serializer (Area 06 scene-contract). Detection rules attach a
 * `benchmark` to evidence as an arbitrary JSON object (median/threshold/level
 * bags differ per rule). The evidence ledger renders these verbatim, so a raw
 * object would leak `[object Object]` / nested JSON into the article. This
 * pure, never-throwing function collapses a benchmark into a short, human
 * readable scalar/string while passing scalars through untouched.
 *
 * Copy-portable: no imports, no AWS, no logger (scene-contract/ is verbatim
 * copied to the SPA).
 */

const SUMMARY_MAX = 80;

/** Primary numeric keys, most specific first. */
const PRIMARY_KEYS = ['directValueShare', 'value', 'median', 'count'] as const;

/** Keys treated as the comparison threshold sibling. */
const THRESHOLD_KEYS = ['threshold', 'thresholdValue', 'limit'] as const;

function firstFinite(o: Record<string, unknown>, keys: readonly string[]): number | undefined {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
  }
  return undefined;
}

function genericSummary(o: Record<string, unknown>): string {
  const s = Object.entries(o)
    .map(([k, v]) => `${k}: ${Array.isArray(v) ? `${String(v[0])}…` : String(v)}`)
    .join(', ');
  return s.length > SUMMARY_MAX ? `${s.slice(0, SUMMARY_MAX)}…` : s;
}

/**
 * Collapse a benchmark value to something safe to render.
 * - scalars (`number` / `string` / `boolean`) / `null` / `undefined` → as-is
 * - object with a primary numeric key → that number (paired with a threshold
 *   sibling if present, as `"<primary> (threshold: <t>)"`)
 * - any other object → a generic `key: value` summary capped to 80 chars
 * Never throws.
 */
export function formatBenchmark(b: unknown): unknown {
  if (
    b === null ||
    b === undefined ||
    typeof b === 'number' ||
    typeof b === 'string' ||
    typeof b === 'boolean'
  ) {
    return b;
  }

  try {
    if (typeof b !== 'object' || Array.isArray(b)) {
      // Functions/symbols/arrays — never expected on a benchmark; degrade.
      return Array.isArray(b) ? genericSummary({ ...b }) : String(b);
    }
    const o = b as Record<string, unknown>;
    const primary = firstFinite(o, PRIMARY_KEYS);
    if (primary !== undefined) {
      const threshold = firstFinite(o, THRESHOLD_KEYS);
      return threshold !== undefined ? `${primary} (threshold: ${threshold})` : primary;
    }
    return genericSummary(o);
  } catch {
    return undefined;
  }
}
