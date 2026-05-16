import { describe, it, expect } from 'vitest';
import { defaultRuleConfig, type RuleConfig } from './config.js';

describe('defaultRuleConfig', () => {
  it('every value is a finite number (no magic-number gaps)', () => {
    for (const [k, v] of Object.entries(defaultRuleConfig)) {
      expect(typeof v, `${k} must be number`).toBe('number');
      expect(Number.isFinite(v), `${k} must be finite`).toBe(true);
    }
  });

  it('matches the LCE legal bands + CATEGORY_MIN_SAMPLE (idea/03)', () => {
    expect(defaultRuleConfig.LCE_COMPRA_DIRECTA_MAX).toBe(90_000);
    expect(defaultRuleConfig.LCE_COTIZACION_MAX).toBe(900_000);
    expect(defaultRuleConfig.CATEGORY_MIN_SAMPLE).toBe(8);
  });

  it('core hero-rule thresholds match idea/03 verbatim', () => {
    // Rule 1
    expect(defaultRuleConfig.RULE_1_MIN_VALUE_MEDIUM).toBe(90_000);
    expect(defaultRuleConfig.RULE_1_MIN_VALUE_HIGH).toBe(900_000);
    // Rule 3
    expect(defaultRuleConfig.RULE_3_DIRECT_SHARE_THRESHOLD).toBe(0.98);
    expect(defaultRuleConfig.RULE_3_MIN_DIRECT_VALUE).toBe(1_000_000);
    expect(defaultRuleConfig.RULE_3_MIN_AWARDS).toBe(5);
    // Rule 7 (HERO)
    expect(defaultRuleConfig.RULE_7_SHARE_THRESHOLD).toBe(0.5);
    expect(defaultRuleConfig.RULE_7_HIGH_THRESHOLD).toBe(0.65);
    expect(defaultRuleConfig.RULE_7_MIN_TOTAL).toBe(1_000_000);
    expect(defaultRuleConfig.RULE_7_MIN_AWARDS).toBe(5);
    // Rule 13
    expect(defaultRuleConfig.RULE_13_MEDIAN_MULT).toBe(3);
    expect(defaultRuleConfig.RULE_13_HIGH_MEDIAN_MULT).toBe(5);
    expect(defaultRuleConfig.RULE_13_IQR_MULT).toBe(1.5);
    // Rule 6 caveat: low-confidence cap
    expect(defaultRuleConfig.RULE_6_MAX_CONFIDENCE).toBe(0.3);
    // Rule 18
    expect(defaultRuleConfig.RULE_18_WINDOW_DAYS).toBe(30);
    expect(defaultRuleConfig.RULE_18_MIN_AWARDS).toBe(3);
    expect(defaultRuleConfig.RULE_18_PER_AWARD_MAX).toBe(90_000);
    // Rule 20 / 21 gates
    expect(defaultRuleConfig.RULE_20_MIN_DAYS).toBe(3);
    expect(defaultRuleConfig.RULE_21_MAX_DAYS).toBe(2);
  });

  it('exposes the full key set (snapshot — adding a rule must update this)', () => {
    const keys = Object.keys(defaultRuleConfig).sort();
    expect(keys).toMatchInlineSnapshot(`
      [
        "CATEGORY_MIN_SAMPLE",
        "LCE_COMPRA_DIRECTA_MAX",
        "LCE_COTIZACION_MAX",
        "RULE_10_MIN_RECURRENCE",
        "RULE_10_MIN_SET_SIZE",
        "RULE_10_MIN_WIN_RATE",
        "RULE_10_SCALE",
        "RULE_11_MIN_VALUE",
        "RULE_11_SCALE",
        "RULE_12_MIN_VALUE",
        "RULE_12_SCALE",
        "RULE_13_HIGH_MEDIAN_MULT",
        "RULE_13_IQR_MULT",
        "RULE_13_MEDIAN_MULT",
        "RULE_13_SCALE",
        "RULE_14_MIN_BUYER_AWARDS",
        "RULE_14_PEER_MULT",
        "RULE_14_SCALE",
        "RULE_15_BAND_FLOOR_FRACTION",
        "RULE_15_SCALE",
        "RULE_16_HIST_MULT",
        "RULE_16_MIN_PRIOR_AWARDS",
        "RULE_16_SCALE",
        "RULE_17_MIN_VALID_BIDS",
        "RULE_17_OTHERS_SPREAD",
        "RULE_17_SCALE",
        "RULE_17_WINNER_RATIO",
        "RULE_18_MIN_AWARDS",
        "RULE_18_PER_AWARD_MAX",
        "RULE_18_SCALE",
        "RULE_18_WINDOW_DAYS",
        "RULE_19_BURST_MULT",
        "RULE_19_MIN_AWARDS",
        "RULE_19_SCALE",
        "RULE_19_WINDOW_DAYS",
        "RULE_1_MAX_TENDERERS",
        "RULE_1_MIN_VALUE_HIGH",
        "RULE_1_MIN_VALUE_MEDIUM",
        "RULE_1_SCALE",
        "RULE_20_MIN_DAYS",
        "RULE_20_MIN_VALUE",
        "RULE_20_SCALE",
        "RULE_21_MAX_DAYS",
        "RULE_21_MIN_VALUE",
        "RULE_21_SCALE",
        "RULE_22_MAX_DOC_COUNT",
        "RULE_22_MIN_VALUE",
        "RULE_22_SCALE",
        "RULE_23_SCALE",
        "RULE_2_MAX_TENDERERS",
        "RULE_2_SCALE",
        "RULE_3_DIRECT_SHARE_THRESHOLD",
        "RULE_3_HIGH_THRESHOLD",
        "RULE_3_MIN_AWARDS",
        "RULE_3_MIN_DIRECT_VALUE",
        "RULE_3_SCALE",
        "RULE_4_MIN_VALUE",
        "RULE_4_SCALE",
        "RULE_5_MAX_VALID_POST_DQ",
        "RULE_5_MIN_BIDS",
        "RULE_6_MAX_CONFIDENCE",
        "RULE_6_WINDOW_DAYS",
        "RULE_7_HIGH_THRESHOLD",
        "RULE_7_MIN_AWARDS",
        "RULE_7_MIN_TOTAL",
        "RULE_7_SCALE",
        "RULE_7_SHARE_THRESHOLD",
        "RULE_8_COUNT_SHARE_THRESHOLD",
        "RULE_8_HIGH_THRESHOLD",
        "RULE_8_MIN_AWARDS",
        "RULE_8_SCALE",
        "RULE_9_MIN_FAMILIES",
        "RULE_9_MIN_TOTAL",
        "RULE_9_SCALE",
      ]
    `);
  });

  it('type is assignable (compile-time guard)', () => {
    const c: RuleConfig = defaultRuleConfig;
    expect(c).toBe(defaultRuleConfig);
  });
});
