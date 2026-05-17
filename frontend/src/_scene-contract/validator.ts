import type {
  Chapter,
  ScenePlanEntry,
  SceneSignal,
  SceneEvidenceItem,
  SceneInvestigation,
  SceneDescriptor,
} from './types.js';
import { SCENES } from './scenes/index.js';
import { defaultScene } from './shortlist.js';
import { deriveFromEvidence, FIXED_CAVEAT } from './derive.js';
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

  // Rule 1 (hackathon-relaxed) — accept ANY known scene that belongs to this
  // chapter. The deterministic shortlist gate was dropped: it rejected valid
  // variant scenes the LLM legitimately picked (forcing the default and
  // killing scene variety). We keep only the two checks the renderer needs —
  // the sceneId must be a real registered scene AND be for THIS chapter
  // (else the SPA can't render it / would render the wrong slot).
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

  // Rule 3 (hackathon-relaxed) — DISABLED as a fallback trigger. The ref
  // resolution loop still runs (cheap, and `*Ref` strings are internal —
  // never rendered), but a missing/non-resolving quant ref no longer forces
  // the deterministic fallback. The LLM owns the figures (read from the
  // digest the prompt exposes); the system-prompt guardrail ("never invent")
  // is the soft guard. Structured outputs keep the params schema-valid.
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
  // Rule 3 (hackathon-relaxed): `quantOk` is computed but NO LONGER forces a
  // fallback — unresolved internal refs must not block an otherwise-good LLM
  // scene. Intentionally not `if (!quantOk) return fb();`.
  void quantOk;

  // Rule 4 (hackathon-relaxed) — presentational id/emphasis cross-references
  // are NO LONGER a fallback trigger. A mismatched emphasis target is a
  // cosmetic concern, not worth discarding the whole LLM scene. The check is
  // dropped entirely (was: any `*Id`/emphasis target must reference an
  // existing id in the same scene).

  // Rule 5 (hackathon-relaxed) — ClosingStatement.caveat must be non-empty,
  // but a missing/empty caveat is BACKFILLED (not a fallback trigger): the
  // mandatory legal-safety wording is fixed server-side anyway.
  if (entry.sceneId === 'ClosingStatement') {
    const caveat = params['caveat'];
    if (typeof caveat !== 'string' || caveat.trim().length === 0) {
      params['caveat'] = FIXED_CAVEAT;
    }
  }

  // Rule 6 — the merged params must satisfy the scene schema. On failure we
  // emit `source:'fallback'`; the publish layer detects this, collects the
  // exact Zod issues, and asks the LLM to fix ONLY the broken fields
  // (`repairScenePlan`) before falling back deterministically. Keeping a
  // clean fail signal here is what makes that targeted repair possible.
  if (!descriptor.schema.safeParse(params).success) return fb();

  return { sceneId: entry.sceneId, params, source: 'llm' };
}
