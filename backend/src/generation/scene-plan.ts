import { validateScenePlan } from '../scene-contract/validator.js';
import { SCENES } from '../scene-contract/index.js';
import { moduleLogger } from '../obs/logger.js';
import type {
  Chapter,
  SceneSignal,
  SceneEvidenceItem,
  SceneInvestigation,
} from '../scene-contract/types.js';
import type { ScenePlanEntry } from '../schema/index.js';
import type { SceneZodFailure } from './claude.js';

const log = moduleLogger('scene');

/** Compact `path: message` list for a failed scene-schema safeParse. */
function formatZodIssues(params: unknown, sceneId: string): string[] {
  const desc = SCENES[sceneId];
  if (desc === undefined) return [];
  const res = desc.schema.safeParse(params);
  if (res.success) return [];
  return res.error.issues
    .slice(0, 20)
    .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`);
}

/**
 * Scenes whose LLM params failed ONLY the Zod schema gate (Rule 6) — i.e. the
 * sceneId is a real scene for that chapter (Rule 1 passed) but the params
 * don't satisfy the schema. These are exactly the chapters worth a targeted
 * LLM repair (`ClaudeClient.repairScenes`) before any deterministic fallback.
 */
export function collectSceneZodFailures(
  llmScenePlan: Record<string, { sceneId: string; params: Record<string, unknown> }>,
  resolved: Record<string, ScenePlanEntry>,
): SceneZodFailure[] {
  const failures: SceneZodFailure[] = [];
  for (const chapter of CHAPTERS) {
    const r = resolved[chapter];
    const llm = llmScenePlan[chapter];
    if (r === undefined || r.source !== 'fallback' || llm === undefined) continue;
    const desc = SCENES[llm.sceneId];
    if (desc === undefined || desc.chapter !== chapter) continue; // Rule-1 fail, not Zod
    const issues = formatZodIssues(llm.params, llm.sceneId);
    if (issues.length === 0) continue;
    failures.push({
      chapter,
      sceneId: llm.sceneId,
      params: llm.params,
      issues,
      expectedFields: Object.keys(desc.kinds),
    });
  }
  return failures;
}

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
  llmScenePlan: Record<string, { sceneId: string; params: Record<string, unknown> }>,
  sceneSignals: SceneSignal[],
  sceneEvidence: SceneEvidenceItem[],
  sceneInvestigation: SceneInvestigation,
  /** Logging-only context; defaults to 'unknown' so existing callers/tests
   * stay source-compatible (additive, optional — no contract break). */
  caseKey = 'unknown',
  /** FULL locked signals/evidence for `ev:`/`sig:` ref resolution only. The
   * LLM's `ev:<i>` indices come from the digest (built over full evidence);
   * `sceneSignals`/`sceneEvidence` are a bounded BSON-safe set, so refs must
   * resolve against the full set. Optional — defaults to the bounded set. */
  resolveSignals?: SceneSignal[],
  resolveEvidence?: SceneEvidenceItem[],
): Record<string, ScenePlanEntry> {
  const out: Record<string, ScenePlanEntry> = {};
  for (const chapter of CHAPTERS) {
    const llm = llmScenePlan[chapter];
    const entry: ScenePlanEntry = {
      sceneId: llm?.sceneId ?? '',
      params: llm?.params ?? {},
      source: 'llm',
    };
    const validated = validateScenePlan(
      chapter,
      entry,
      sceneSignals,
      sceneEvidence,
      sceneInvestigation,
      resolveSignals,
      resolveEvidence,
    );
    out[chapter] = validated;
    const llmSceneId = llm?.sceneId ?? '';
    let reason = '';
    if (validated.source === 'fallback') {
      if (llmSceneId === '') {
        reason = ' (reason: no llm sceneId)';
      } else if (SCENES[llmSceneId] === undefined || SCENES[llmSceneId]!.chapter !== chapter) {
        reason = ' (reason: unknown sceneId / wrong chapter)';
      } else {
        const issues = formatZodIssues(llm?.params, llmSceneId);
        reason = ` (reason: zod_fail issues=[${issues.join(' | ')}])`;
      }
    }
    log(
      `case=${caseKey} chapter=${chapter} ` +
        `llm_sceneId=${llmSceneId === '' ? 'NONE' : llmSceneId} ` +
        `validated=${validated.sceneId} source=${validated.source}${reason}`,
    );
  }
  return out;
}
