import { createHash } from 'node:crypto';
import type { Signal } from '../schema/index.js';

/** canonical entity identifier used for all grouping (never join on names) */
export function canonicalEntityId(scheme: string, id: string): string {
  return `${scheme}:${id}`;
}

/** sha256(buyerId|family|scope) hex — stable caseKey for an investigation */
export function caseKey(buyerId: string, family: string, scope: string): string {
  return createHash('sha256').update(`${buyerId}|${family}|${scope}`).digest('hex');
}

/**
 * Deterministic content hash over a set of signals.
 *
 * Normalization (LOCKED — Area 07 dedup MUST use the same algorithm):
 * 1. Sort signals by (rule_id ASC, ocid ASC).
 * 2. For each signal, project: { rule_id, ocid, evidence: [{ field, value,
 *    [comparison], [benchmark] }] } — optional fields OMITTED (not null) when undefined.
 * 3. Recursively sort object keys (including nested objects in evidence items).
 * 4. JSON.stringify the normalized array.
 * 5. SHA-256 hex of that string.
 *
 * Changing this function invalidates all stored evidenceHash values → duplicate
 * articles. Add a fixed-vector regression test for any change.
 */
export function evidenceHash(
  signals: Pick<Signal, 'rule_id' | 'ocid' | 'evidence'>[],
): string {
  const sorted = [...signals].sort((a, b) => {
    const byRule = a.rule_id.localeCompare(b.rule_id);
    return byRule !== 0 ? byRule : a.ocid.localeCompare(b.ocid);
  });

  const normalized = sorted.map((s) => ({
    rule_id: s.rule_id,
    ocid: s.ocid,
    evidence: s.evidence.map((e) => {
      const item: Record<string, unknown> = { field: e.field, value: e.value };
      if (e.comparison !== undefined) item['comparison'] = e.comparison;
      if (e.benchmark !== undefined) item['benchmark'] = e.benchmark;
      return item;
    }),
  }));

  // Recursively sort object keys for determinism
  const stable = JSON.stringify(normalized, (_key, val: unknown) => {
    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      return Object.fromEntries(
        Object.entries(val as Record<string, unknown>).sort(([a], [b]) =>
          a.localeCompare(b),
        ),
      );
    }
    return val;
  });

  return createHash('sha256').update(stable).digest('hex');
}

/**
 * Derives entity type from party data.
 * Rule priority: legalEntityTypeDetail → name heuristic → 'unknown'.
 * Note: 'unknown' is treated as individual (privacy-safe) downstream.
 */
export function deriveEntityType(party: {
  legalEntityTypeDetail?: string;
  name?: string;
}): 'company' | 'individual' | 'unknown' {
  const detail = party.legalEntityTypeDetail?.toLowerCase() ?? '';
  if (detail) {
    if (/sociedad|s\.a\.|s\.a\b|cooperativa/i.test(detail)) return 'company';
    if (detail.includes('persona individual') || detail.includes('natural'))
      return 'individual';
  }
  const name = party.name ?? '';
  if (/SOCIEDAD|S\.A\.|COOPERATIVA/i.test(name)) return 'company';
  // Guatemalan individual name pattern: LASTNAME,LASTNAME,,FIRSTNAME,
  if (/^[A-ZÁÉÍÓÚÑÜ]+,[A-ZÁÉÍÓÚÑÜ]+,,/.test(name)) return 'individual';
  return 'unknown';
}
