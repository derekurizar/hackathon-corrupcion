import { validateScenePlan } from '../scene-contract/validator.js';
import type {
  Chapter,
  SceneSignal,
  SceneEvidenceItem,
  SceneInvestigation,
} from '../scene-contract/types.js';
import type { ScenePlanEntry } from '../schema/index.js';

/**
 * The fixed 7-chapter spine (idea/05). Every Investigation MUST carry an entry
 * for all 7 — the frontend (Area 11) renders the full spine.
 */
const CHAPTERS: readonly Chapter[] = [
  'cover',
  'elCaso',
  'sigueElDinero',
  'lasConexiones',
  'evidencia',
  'cronologia',
  'cierre',
];

/**
 * Resolves the LLM-proposed scene plan against the Area 06 deterministic
 * validator. For every chapter the LLM entry (or an empty placeholder) is
 * passed to `validateScenePlan`, which self-clamps to the shortlist,
 * overwrites bound params with authoritative server values, validates quant
 * refs, and self-falls-back to the chapter default on ANY failure. We persist
 * the validator's returned entry verbatim (with its `source`). No shortlist or
 * fallback logic is re-implemented here.
 */
export function resolveScenePlan(
  _firedRuleIds: string[],
  llmScenePlan: Record<
    string,
    { sceneId: string; params: Record<string, unknown> }
  >,
  sceneSignals: SceneSignal[],
  sceneEvidence: SceneEvidenceItem[],
  sceneInvestigation: SceneInvestigation,
): Record<string, ScenePlanEntry> {
  const out: Record<string, ScenePlanEntry> = {};
  for (const chapter of CHAPTERS) {
    const llm = llmScenePlan[chapter];
    const entry: ScenePlanEntry = {
      sceneId: llm?.sceneId ?? '',
      params: llm?.params ?? {},
      source: 'llm',
    };
    out[chapter] = validateScenePlan(
      chapter,
      entry,
      sceneSignals,
      sceneEvidence,
      sceneInvestigation,
    );
  }
  return out;
}
