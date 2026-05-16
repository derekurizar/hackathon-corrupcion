import type { SceneSignal, SceneEvidenceItem } from './types.js';

/**
 * Ref grammar:
 *   ev:<int>                          → an index into the flattened case-evidence
 *   sig:<rule_id-name>[.<dotPath>]    → a signal by rule_id, optional dotted path
 *
 * Examples:
 *   'ev:3'
 *   'sig:supplier_concentration_per_buyer'
 *   'sig:single_bidder.evidence'
 *   'sig:single_bidder.evidence.0.value'
 */
export type ParsedRef =
  | { kind: 'ev'; index: number }
  | { kind: 'sig'; ruleId: string; path?: string };

const EV_RE = /^ev:(\d+)$/;
const SIG_RE = /^sig:([^.]+)(?:\.(.+))?$/;

export function parseRef(s: string): ParsedRef | null {
  if (typeof s !== 'string') return null;

  const ev = EV_RE.exec(s);
  if (ev?.[1] !== undefined) {
    const index = Number.parseInt(ev[1], 10);
    return Number.isInteger(index) ? { kind: 'ev', index } : null;
  }

  const sig = SIG_RE.exec(s);
  if (sig?.[1] !== undefined) {
    const ruleId = sig[1];
    const path = sig[2];
    return path !== undefined && path.length > 0
      ? { kind: 'sig', ruleId, path }
      : { kind: 'sig', ruleId };
  }

  return null;
}

/**
 * LOCKED ORDERING CONTRACT — must match `identity.evidenceHash` normalization
 * (idea/06): signals sorted by (rule_id ASC, ocid ASC); within each signal,
 * `evidence[]` is kept in array order. The case-level `evidence` array is then
 * appended. Area 07 MUST emit `investigation.evidence` in this same order so
 * `ev:<index>` resolves identically on both the generation and SPA sides.
 *
 * Purity: this duplicates the sort key from `identity/` deliberately — do NOT
 * import from `identity/` (it pulls `node:crypto` and breaks copy-portability).
 */
export function flattenCaseEvidence(
  signals: SceneSignal[],
  evidence: SceneEvidenceItem[],
): SceneEvidenceItem[] {
  const sorted = [...signals].sort((a, b) => {
    const byRule = a.rule_id.localeCompare(b.rule_id);
    return byRule !== 0 ? byRule : a.ocid.localeCompare(b.ocid);
  });

  const flat: SceneEvidenceItem[] = [];
  for (const s of sorted) {
    for (const e of s.evidence) flat.push(e);
  }
  for (const e of evidence) flat.push(e);
  return flat;
}

/** Walks a dotted path on an object/array. Returns undefined on any miss. */
function walkPath(root: unknown, path: string): unknown {
  let cur: unknown = root;
  for (const seg of path.split('.')) {
    if (cur == null) return undefined;
    if (Array.isArray(cur)) {
      const idx = Number.parseInt(seg, 10);
      if (!Number.isInteger(idx)) return undefined;
      cur = cur[idx];
    } else if (typeof cur === 'object') {
      cur = (cur as Record<string, unknown>)[seg];
    } else {
      return undefined;
    }
  }
  return cur;
}

/**
 * Resolves a parsed ref against the case signals/evidence.
 * Returns `undefined` if the ref does not resolve.
 *
 * - `ev:<i>`            → the i-th flattened evidence item (whole object)
 * - `sig:<id>`          → the matching signal's `evidence` array
 * - `sig:<id>.<path>`   → dotted path walked on the matching signal object
 */
export function resolveRef(
  ref: ParsedRef,
  signals: SceneSignal[],
  evidence: SceneEvidenceItem[],
): unknown {
  if (ref.kind === 'ev') {
    if (ref.index < 0) return undefined;
    const flat = flattenCaseEvidence(signals, evidence);
    return ref.index < flat.length ? flat[ref.index] : undefined;
  }

  const sig = signals.find((s) => s.rule_id === ref.ruleId);
  if (sig === undefined) return undefined;
  if (ref.path === undefined) return sig.evidence;
  return walkPath(sig, ref.path);
}
