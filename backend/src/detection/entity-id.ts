/**
 * Raw `OrganizationReference.id` (e.g. `GT-NIT-7894880`) → canonical entity id
 * (`GT-NIT:7894880`), matching `canonicalEntityId(scheme, identifier.id)` used
 * by ingestion (`ingest/entities.ts` / `ingest/normalize.ts`).
 *
 * CRITICAL: do NOT naively split on the first/last hyphen. The `GT-GCID`
 * scheme carries compound identifiers like
 * `GT-GCID-CO-0D13D3EE908F02969DED73509B7566AB` whose `identifier.id` is
 * `CO-0D13D3EE908F02969DED73509B7566AB` (itself containing hyphens). Schemes
 * are matched longest-first against a fixed catalog; everything after the
 * `<scheme>-` prefix is the verbatim `identifier.id`.
 */

// Known Guatecompras schemes (observed in
// planning/assets/guatecompras_schema_report.md `identifier.scheme`).
// Order is longest-prefix-first so a scheme is never matched as a substring
// of a longer one (here all are 4 chars after `GT-`, but the order is the
// documented contract and keeps future additions safe).
const KNOWN_SCHEMES = ['GT-GCID', 'GT-GCUC', 'GT-CISP', 'GT-NIT'] as const;

/**
 * Converts a raw composed id to its canonical `scheme:identifierId` form.
 * Unknown schemes (not in `KNOWN_SCHEMES`) are returned verbatim — we never
 * fabricate a canonical id we cannot prove (consistent with ingestion, which
 * falls raw ids through when `parties` is absent).
 */
export function rawToCanonical(rawId: string): string {
  for (const scheme of KNOWN_SCHEMES) {
    if (rawId.startsWith(scheme + '-')) {
      const identifierId = rawId.slice(scheme.length + 1);
      return `${scheme}:${identifierId}`;
    }
  }
  // Already canonical (contains a ':') or an unknown scheme: return as-is.
  return rawId;
}
