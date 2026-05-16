import type { Chapter } from '../scene-contract/index.js';
import { SCENES, shortlist, RULE_CATALOG } from '../scene-contract/index.js';

/**
 * Prompt-facing scene guidance (pure, static). Lets the LLM pick a real
 * `sceneId` from the per-case shortlist and shape `params` to pass the Area-06
 * `validateScenePlan` gate, instead of inventing names that always fall back.
 *
 * This lives in generation/ (not scene-contract/) on purpose: it is a
 * prompt concern, and scene-contract/ is copied verbatim to the frontend by
 * `sync:scene-contract`. It only reads `SCENES`/`shortlist` so it cannot drift
 * (a test asserts every descriptor is rendered).
 */

const CHAPTER_ORDER: readonly Chapter[] = [
  'cover',
  'elCaso',
  'sigueElDinero',
  'lasConexiones',
  'evidencia',
  'cronologia',
  'cierre',
];

/** The guaranteed default scene per chapter (shortlist head with no rules). */
function defaultSceneId(chapter: Chapter): string {
  return shortlist(chapter, [])[0]!;
}

/**
 * Static catalog string for the cached system prefix: every scene grouped by
 * chapter with its param paths annotated by kind. Deterministic — derived from
 * `SCENES` (stable insertion order), no per-case input.
 */
export function renderSceneCatalog(): string {
  const lines: string[] = [
    'SCENE CATALOG (static)',
    "- Set scenePlan[chapter].sceneId ONLY to a sceneId from that chapter's",
    '  ALLOWED SCENES list in the user block. Prefer the (default) scene — the',
    '  server backfills all its bound params, so it almost always validates.',
    '- params kinds:',
    '  - bound: server overwrites these for the (default) scene; still emit the',
    '    field with a plausibly-typed placeholder so the shape exists.',
    '  - quant: a number you read from an EVIDENCE item; it MUST be paired with',
    '    its ref companion — `<key>Ref`, or a sibling `ref`, or for `<x>Value`',
    '    the field `<x>Ref` — set to the exact `ev:<i>` whose value equals it.',
    '  - a `*Ref`/`ref`/`valueRef` leaf: set it to an `ev:<i>` that resolves.',
    '  - presentational: free prose/order; keep any enum/tuple values valid.',
    '- Every scene-schema constraint (enums, tuple shape, array min/max) still',
    '  applies; when unsure, use the (default) scene.',
    '',
  ];
  for (const chapter of CHAPTER_ORDER) {
    const scenes = Object.values(SCENES).filter((s) => s.chapter === chapter);
    const def = defaultSceneId(chapter);
    lines.push(`[${chapter}]`);
    for (const s of scenes) {
      const kinds = Object.entries(s.kinds)
        .map(([p, k]) => `${p}:${k}`)
        .join(', ');
      const tag = s.sceneId === def ? ' (default)' : '';
      lines.push(`- ${s.sceneId}${tag} { ${kinds} }`);
    }
  }
  return lines.join('\n');
}

/** Catalog ordinals (1–23) for real `rule_id` strings; unknowns dropped. */
function ordinalsOf(ruleIds: readonly string[]): number[] {
  return [
    ...new Set(
      ruleIds
        .map((id) => RULE_CATALOG.find((r) => r.id === id)?.ordinal)
        .filter((n): n is number => n !== undefined),
    ),
  ];
}

/**
 * Per-case allowed sceneIds per chapter (the deterministic shortlist). The
 * first entry of each list is the chapter default. Identical inputs ⇒ identical
 * output (shortlist is a fixed switch over fired-rule ordinals).
 */
export function chapterShortlists(
  ruleIds: readonly string[],
  hasBenchmark: boolean,
): { chapter: Chapter; scenes: string[] }[] {
  const ords = ordinalsOf(ruleIds);
  return CHAPTER_ORDER.map((chapter) => ({
    chapter,
    scenes: shortlist(chapter, ords, { hasBenchmark }),
  }));
}
