import type { z } from 'zod';

/**
 * The fixed chapter spine of the Investigation Article (idea/05).
 * Order is constant; the scene inside each chapter is data-driven.
 */
export type Chapter =
  | 'cover'
  | 'elCaso'
  | 'sigueElDinero'
  | 'lasConexiones'
  | 'evidencia'
  | 'cronologia'
  | 'cierre';

/**
 * Param binding policy.
 * - `bound`          — server-supplied, overwritten with authoritative values.
 * - `quant`          — LLM-supplied number/label that MUST carry a resolving ref.
 * - `presentational` — free prose/ordering/emphasis (shape/length only).
 *
 * (`quant` is the dev-plan token for "quantitative".)
 */
export type ParamKind = 'bound' | 'quant' | 'presentational';

/** One chapter's resolved scene + its params. */
export type ScenePlanEntry = {
  sceneId: string;
  params: Record<string, unknown>;
  source: 'llm' | 'fallback';
};

/** The full scene plan: one entry per chapter. */
export type ScenePlan = Record<Chapter, ScenePlanEntry>;

/**
 * A scene descriptor: its id, the chapter it fills, the Zod schema that
 * validates its params, and the kind-tag for every param path.
 *
 * `kinds` keys use a dot-path grammar with a `[]` suffix for arrays-of-objects:
 *   - `'heroStat.value'`   — nested object field
 *   - `'streams[].amount'` — field of every element of an object array
 */
export type SceneDescriptor = {
  sceneId: string;
  chapter: Chapter;
  schema: z.ZodType<unknown>;
  kinds: Record<string, ParamKind>;
};

/**
 * Input view-types — copy-portable. These structurally match Area 03's
 * `Signal` / `EvidenceItem` / `Investigation` but are defined here so the
 * `scene-contract/` folder compiles standalone with zero cross-imports.
 * The Area 03 ⊆ scene-contract assignability is asserted only in
 * `scene-plan.compat.test.ts` (via the `'backend'` package specifier).
 */
// Optionality here is widened on purpose. Area 03's `EvidenceItem` is
// Zod-inferred: `z.unknown()` → `value?: unknown` and `z.string().optional()`
// → `comparison?: string | undefined`. Under `exactOptionalPropertyTypes`
// these only satisfy `Signal ⊆ SceneSignal` if the view-type's `value` is
// ALSO optional and `comparison` accepts `undefined`. The runtime validator
// already guards every access (`typeof e.value === ...`), so widening here is
// safe and is the correct superset direction (view-type accepts Area 03).
export type SceneEvidenceItem = {
  field: string;
  value?: unknown;
  comparison?: string | undefined;
  benchmark?: unknown;
};

export type SceneSignal = {
  rule_id: string;
  ocid: string;
  family: 'F1' | 'F2' | 'F3' | 'F4';
  severity: 'low' | 'medium' | 'high';
  evidence: SceneEvidenceItem[];
};

export type SceneInvestigation = {
  buyer: { id: string; name: string };
  supplier: {
    id: string;
    displayNameEs: string;
    displayNameEn: string;
    isIndividual: boolean;
  };
  reviewPriority: 'high' | 'medium' | 'low';
  totalValue: number;
  currency: string;
  evidence: SceneEvidenceItem[];
};
