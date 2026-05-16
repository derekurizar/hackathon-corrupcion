// Public surface of the detection engine. Importing this barrel also loads
// `./rules/index.js` for side-effects, populating the `RULES` registry.
import './rules/index.js';

export { RULES, registerRule, firedRulesShortlist } from './registry.js';
export { defaultRuleConfig } from './config.js';
export type { RuleConfig } from './config.js';
export { confidence, clamp01 } from './confidence.js';
export { reviewPriority } from './review-priority.js';
export { awardCategory, resolveCategoryLevel } from './category.js';
export { rawToCanonical } from './entity-id.js';
export { isDirectMethod, isNoncompetitiveMethod } from './method.js';
export type { Rule, RuleContext, ContractSignal, EntityIndex, RollupData } from './types.js';
