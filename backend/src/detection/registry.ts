import { shortlist, RULE_CATALOG } from '../scene-contract/index.js';
import type { Chapter } from '../scene-contract/types.js';
import type { Rule } from './types.js';

/**
 * The canonical rule registry. `RULES` is the single source of truth for
 * `rule_id → family`; the scene-contract `RULE_CATALOG` (Area 06) is
 * intentionally a self-contained copy. `registry.consistency.test.ts` asserts
 * the two never diverge.
 *
 * Pluggable: adding a rule = add a module under `rules/` that calls
 * `registerRule(...)` and import it for side-effect in `./rules/index.js`.
 */
export const RULES: Rule[] = [];

export function registerRule(rule: Rule): void {
  if (RULES.some((r) => r.id === rule.id)) return; // idempotent on re-import
  RULES.push(rule);
}

/**
 * Maps fired `rule_id` *string names* → catalog ordinals, then delegates to
 * the deterministic scene `shortlist` (Area 06). Unknown ids are dropped. The
 * first returned sceneId is the guaranteed default for the chapter.
 */
export function firedRulesShortlist(
  chapter: Chapter,
  firedRuleIds: string[],
  opts?: { hasBenchmark?: boolean; hasRegion?: boolean },
): string[] {
  const ordinals = [
    ...new Set(
      firedRuleIds
        .map((id) => RULE_CATALOG.find((r) => r.id === id)?.ordinal)
        .filter((n): n is number => n !== undefined),
    ),
  ];
  return shortlist(chapter, ordinals, opts);
}
