import { RULES } from '../registry.js';
import { defaultRuleConfig } from '../config.js';
import type { RuleContext } from '../types.js';
import type { CuratedRelease } from '../../schema/curated-release.js';
import type { Benchmark } from '../../schema/benchmarks.js';
import type { EntityIndex } from '../types.js';
import { makeBenchmark, makeEntityIndex } from './release.js';

export function ruleById(id: string) {
  const r = RULES.find((x) => x.id === id);
  if (!r) throw new Error(`rule not registered: ${id}`);
  return r;
}

export function makeCtx(opts: {
  release: CuratedRelease;
  benchmarks?: Benchmark;
  entities?: EntityIndex;
}): RuleContext {
  return {
    release: opts.release,
    benchmarks: opts.benchmarks ?? makeBenchmark(),
    entities: opts.entities ?? makeEntityIndex({}),
    config: defaultRuleConfig,
  };
}
