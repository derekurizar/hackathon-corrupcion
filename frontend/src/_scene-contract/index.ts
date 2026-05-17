// Public surface of the scene-contract module (pure: types + Zod + validation).
// Re-exported from backend/src/index.ts for Area 07; hand-synced to
// frontend/src/_scene-contract/ via `pnpm --dir backend run sync:scene-contract`.

export * from './types.js';
export { SCENES, CORE_SCENE_IDS, VARIANT_SCENE_IDS } from './scenes/index.js';
export {
  shortlist,
  defaultScene,
  ruleFamily,
  ruleOrdinalsFromSignals,
  RULE_CATALOG,
} from './shortlist.js';
export type { RuleFamily } from './shortlist.js';
export { validateScenePlan } from './validator.js';
export { deriveFromEvidence, FIXED_CAVEAT } from './derive.js';
export { parseRef, resolveRef, flattenCaseEvidence } from './refs.js';
export type { ParsedRef } from './refs.js';
export { humanField, FIELD_LABELS } from './fieldLabels.js';
