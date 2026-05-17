import type {
  Chapter,
  ScenePlanEntry,
  SceneSignal,
  SceneEvidenceItem,
  SceneInvestigation,
  SceneDescriptor,
} from './types.js';
import { SCENES } from './scenes/index.js';
import { shortlist, defaultScene, ruleOrdinalsFromSignals } from './shortlist.js';
import { deriveFromEvidence } from './derive.js';
import { parseRef, resolveRef } from './refs.js';

type Seg = { key: string; array: boolean };

/** Parses a kinds-grammar path: `a.b`, `arr[].c`, `arr[]`. */
function parsePath(path: string): Seg[] {
  return path.split('.').map((raw) => {
    if (raw.endsWith('[]')) return { key: raw.slice(0, -2), array: true };
    return { key: raw, array: false };
  });
}

/**
 * Visits every concrete leaf for a kinds path, yielding the leaf value, its
 * containing object, and the leaf key. Arrays (`[]`) fan out over elements.
 * Missing intermediate nodes are skipped (optional params).
 */
function visitLeaves(
  root: unknown,
  segs: Seg[],
  cb: (leafValue: unknown, parent: Record<string, unknown>, key: string) => void,
): void {
  const recur = (node: unknown, i: number): void => {
    if (node == null || typeof node !== 'object') return;
    const seg = segs[i]!;
    const isLast = i === segs.length - 1;

    if (seg.array) {
      const arr = (node as Record<string, unknown>)[seg.key];
      if (!Array.isArray(arr)) return;
      if (isLast) {
        // path ends at `arr[]` — each element is itself a leaf
        for (const el of arr) {
          cb(el, node as Record<string, unknown>, seg.key);
        }
        return;
      }
      for (const el of arr) recur(el, i + 1);
      return;
    }

    if (isLast) {
      const obj = node as Record<string, unknown>;
      if (Object.prototype.hasOwnProperty.call(obj, seg.key)) {
        cb(obj[seg.key], obj, seg.key);
      }
      return;
    }
    recur((node as Record<string, unknown>)[seg.key], i + 1);
  };
  recur(root, 0);
}

/**
 * Companion ref field for a numeric quant leaf. Scene schemas pair a numeric
 * value with its ref by one of three deterministic naming conventions:
 *   - `<key>Ref`            (e.g. `amount` → `amountRef`, `topShare` → `topShareRef`)
 *   - sibling `ref`         (e.g. `heroStat.value` → `heroStat.ref`)
 *   - `<base>Ref` dropping a trailing `Value` (e.g. `totalValue` → `totalRef`)
 */
function companionRef(parent: Record<string, unknown>, key: string): unknown {
  const candidates = [`${key}Ref`, 'ref'];
  if (key.endsWith('Value')) {
    candidates.push(`${key.slice(0, -'Value'.length)}Ref`);
  }
  for (const c of candidates) {
    if (Object.prototype.hasOwnProperty.call(parent, c)) return parent[c];
  }
  return undefined;
}

/**
 * Overwrites the bound param at `segs` in `target` with the value at the same
 * path in `authoritative`. Handles three terminal shapes:
 *   - `a.b`      scalar/object leaf — direct copy
 *   - `arr[]`    whole-array leaf — copy the entire authoritative array
 *   - `arr[].f`  per-element field — copy field for each aligned element
 * Missing authoritative nodes are skipped (param left as-is).
 */
function overwriteBound(target: unknown, authoritative: unknown, segs: Seg[]): void {
  const recur = (t: unknown, a: unknown, i: number): void => {
    if (t == null || a == null || typeof t !== 'object' || typeof a !== 'object') {
      return;
    }
    const seg = segs[i]!;
    const isLast = i === segs.length - 1;
    const to = t as Record<string, unknown>;
    const ao = a as Record<string, unknown>;

    if (seg.array) {
      const aArr = ao[seg.key];
      if (!Array.isArray(aArr)) return;
      if (isLast) {
        // whole-array bound leaf (e.g. `ctas[]`, `missingStages[]`)
        to[seg.key] = structuredClone(aArr);
        return;
      }
      const tArr = to[seg.key];
      if (!Array.isArray(tArr)) return;
      const n = Math.min(tArr.length, aArr.length);
      for (let k = 0; k < n; k += 1) recur(tArr[k], aArr[k], i + 1);
      return;
    }

    if (isLast) {
      if (Object.prototype.hasOwnProperty.call(ao, seg.key)) {
        to[seg.key] = structuredClone(ao[seg.key]);
      }
      return;
    }
    recur(to[seg.key], ao[seg.key], i + 1);
  };
  recur(target, authoritative, 0);
}

function isRefFieldName(key: string): boolean {
  return key === 'ref' || key.endsWith('Ref');
}

function isTargetKey(key: string): boolean {
  return key.startsWith('emphasis') || key === 'emphasisTarget';
}

/**
 * Collects every referenceable string id in the params (for rule 4). The
 * presentational emphasis/target pointers themselves are EXCLUDED — a pointer
 * must reference another item's id, never trivially match itself.
 */
function collectIds(params: Record<string, unknown>): Set<string> {
  const ids = new Set<string>();
  const walk = (node: unknown): void => {
    if (node == null) return;
    if (Array.isArray(node)) {
      for (const el of node) walk(el);
      return;
    }
    if (typeof node === 'object') {
      for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
        if (typeof v === 'string' && k.endsWith('Id') && !isTargetKey(k)) {
          ids.add(v);
        }
        walk(v);
      }
    }
  };
  walk(params);
  return ids;
}

function fallback(
  chapter: Chapter,
  signals: SceneSignal[],
  evidence: SceneEvidenceItem[],
  investigation: SceneInvestigation,
): ScenePlanEntry {
  return {
    sceneId: defaultScene(chapter),
    params: deriveFromEvidence(chapter, signals, evidence, investigation),
    source: 'fallback',
  };
}

/**
 * Validates an LLM-produced scene plan entry against the deterministic
 * shortlist + evidence binding (idea/05 §"Evidence-binding validator
 * contract"). On ANY failure returns the chapter's derived default scene with
 * `source: 'fallback'`; on full success returns the (bound-overwritten) entry
 * with `source: 'llm'`. The article therefore always renders.
 *
 * `signals`/`evidence` drive the shortlist + the BSON-safe fallback/bound
 * derivation (a bounded representative set). `resolveSignals`/`resolveEvidence`
 * are the FULL locked set used ONLY to resolve `ev:<i>`/`sig:` refs — the
 * LLM's `ev:<i>` indices come from the digest, which is built over the full
 * evidence, so resolving them against the bounded set would spuriously fail.
 * Both default to `signals`/`evidence` (back-compat: identical behavior when
 * the caller does not split the sets).
 */
export function validateScenePlan(
  chapter: Chapter,
  entry: ScenePlanEntry,
  signals: SceneSignal[],
  evidence: SceneEvidenceItem[],
  investigation: SceneInvestigation,
  resolveSignals?: SceneSignal[],
  resolveEvidence?: SceneEvidenceItem[],
): ScenePlanEntry {
  const rSignals = resolveSignals ?? signals;
  const rEvidence = resolveEvidence ?? evidence;
  const fb = (): ScenePlanEntry => fallback(chapter, signals, evidence, investigation);

  // Rule 1 — sceneId must be in the chapter shortlist.
  const allowed = shortlist(chapter, ruleOrdinalsFromSignals(signals), {
    hasBenchmark: signals.some((s) => s.evidence.some((e) => e.benchmark !== undefined)),
  });
  if (!allowed.includes(entry.sceneId)) return fb();

  const descriptor: SceneDescriptor | undefined = SCENES[entry.sceneId];
  if (descriptor === undefined || descriptor.chapter !== chapter) return fb();

  // Work on a shallow-cloned params object so we can overwrite bound params.
  const params: Record<string, unknown> = structuredClone(entry.params);

  // Rule 2 — overwrite bound params with authoritative server values.
  // Authoritative source = the server-derived default-scene params. This is
  // well-defined only for the default scene; variant bound params pass through
  // (Phase-0 deviation, see return summary / known gaps).
  if (entry.sceneId === defaultScene(chapter)) {
    const authoritative = deriveFromEvidence(chapter, signals, evidence, investigation);
    for (const [path, kind] of Object.entries(descriptor.kinds)) {
      if (kind !== 'bound') continue;
      overwriteBound(params, authoritative, parsePath(path));
    }
  }

  // Rule 3 — every quant param must carry a ref that RESOLVES to a real
  // evidence item. We deliberately do NOT require the figure to equal the
  // cited row's raw `.value`: the citable numbers (shares, rollup aggregates,
  // benchmark metrics) live in `benchmark`/digest rollups, never in
  // `evidence[i].value`, so a value-match check forced a universal fallback.
  // The LLM owns the figure (read from the digest the prompt exposes); the
  // resolvable ref guarantees traceability and blocks invented citations.
  let quantOk = true;
  for (const [path, kind] of Object.entries(descriptor.kinds)) {
    if (kind !== 'quant') continue;
    const segs = parsePath(path);
    const leafKey = segs[segs.length - 1]!.key;

    visitLeaves(params, segs, (leafValue, parent, key) => {
      if (!quantOk) return;

      if (isRefFieldName(leafKey)) {
        // The leaf IS a ref string (e.g. facts[].valueRef, *Ref companions).
        if (leafValue === undefined) return; // optional ref, nothing to bind
        if (typeof leafValue !== 'string') {
          quantOk = false;
          return;
        }
        const parsed = parseRef(leafValue);
        if (parsed === null) {
          quantOk = false;
          return;
        }
        if (resolveRef(parsed, rSignals, rEvidence) === undefined) {
          quantOk = false;
        }
        return;
      }

      // Numeric quant value — must carry a companion ref that resolves to a
      // real evidence item. The figure itself is the LLM's (legitimately read
      // from the digest rollups/benchmarks the prompt surfaces); we no longer
      // require it to equal the cited row's raw `.value` scalar.
      if (typeof leafValue !== 'number') {
        quantOk = false;
        return;
      }
      const refStr = companionRef(parent, key);
      if (typeof refStr !== 'string') {
        quantOk = false;
        return;
      }
      const parsed = parseRef(refStr);
      if (parsed === null) {
        quantOk = false;
        return;
      }
      if (resolveRef(parsed, rSignals, rEvidence) === undefined) {
        quantOk = false;
      }
    });
  }
  if (!quantOk) return fb();

  // Rule 4 — presentational: shape/length only; any `*Id`/emphasis target
  // must reference an existing id in the same scene.
  const presentIds = collectIds(params);
  let presOk = true;
  for (const [path, kind] of Object.entries(descriptor.kinds)) {
    if (kind !== 'presentational') continue;
    const segs = parsePath(path);
    const leafKey = segs[segs.length - 1]!.key;
    const isTarget =
      leafKey.endsWith('Id') || leafKey === 'emphasisSupplierId' || leafKey === 'emphasisTarget';
    visitLeaves(params, segs, (leafValue) => {
      if (!presOk) return;
      if (isTarget && typeof leafValue === 'string') {
        if (!presentIds.has(leafValue)) presOk = false;
      }
    });
  }
  if (!presOk) return fb();

  // Rule 5 — ClosingStatement.caveat must be present & non-empty.
  if (entry.sceneId === 'ClosingStatement') {
    const caveat = params['caveat'];
    if (typeof caveat !== 'string' || caveat.trim().length === 0) return fb();
  }

  // Final shape gate — the merged params must satisfy the scene schema.
  if (!descriptor.schema.safeParse(params).success) return fb();

  return { sceneId: entry.sceneId, params, source: 'llm' };
}
