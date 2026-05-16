import { describe, it, expect } from 'vitest';
import './rules/index.js'; // side-effect: register all 23 rules
import { RULES, firedRulesShortlist } from './registry.js';
import { RULE_CATALOG } from '../scene-contract/index.js';

describe('RULES registry consistency', () => {
  it('registers all 23 catalog rules exactly once', () => {
    expect(RULES).toHaveLength(23);
    const ids = RULES.map((r) => r.id);
    expect(new Set(ids).size).toBe(23);
  });

  it('every RULES entry id exists in RULE_CATALOG with the same family', () => {
    for (const rule of RULES) {
      const cat = RULE_CATALOG.find((r) => r.id === rule.id);
      expect(cat, `rule ${rule.id} missing from RULE_CATALOG`).toBeDefined();
      expect(rule.family, `family mismatch for ${rule.id}`).toBe(cat!.family);
    }
  });

  it('every RULE_CATALOG id is implemented in RULES (no missing rule)', () => {
    for (const cat of RULE_CATALOG) {
      expect(
        RULES.find((r) => r.id === cat.id),
        `catalog rule ${cat.id} not implemented`,
      ).toBeDefined();
    }
  });

  it('needsHistory is a boolean for every rule', () => {
    for (const r of RULES) expect(typeof r.needsHistory).toBe('boolean');
  });
});

describe('firedRulesShortlist', () => {
  it('maps rule-id names → ordinals → deterministic scene shortlist', () => {
    // Rule 13 (price_outlier_vs_category) → ordinal 13 → PriceBars in
    // sigueElDinero.
    const scenes = firedRulesShortlist('sigueElDinero', ['price_outlier_vs_category']);
    expect(scenes[0]).toBe('MoneyFlowStreams'); // guaranteed default
    expect(scenes).toContain('PriceBars');
  });

  it('drops unknown rule ids', () => {
    const scenes = firedRulesShortlist('cover', ['not_a_rule']);
    expect(scenes).toEqual(['CoverHeadline']);
  });

  it('contract_splitting (ordinal 18) unlocks SplittingCluster', () => {
    const scenes = firedRulesShortlist('lasConexiones', ['contract_splitting']);
    expect(scenes).toContain('SplittingCluster');
  });
});
