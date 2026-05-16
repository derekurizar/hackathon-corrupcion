/**
 * The single source of truth for every detection threshold. NO magic numbers
 * may appear in rule bodies — rules read `ctx.config.*` only. Values are
 * transcribed verbatim from `planning/idea/03-detection-rules.md`
 * (§"Default RuleConfig" + the 23-rule table). These are the Phase-1 untuned
 * starter defaults; Area 05 Phase 4 = tuning here only.
 *
 * `confidence = clamp01((metric − threshold) / scale)`; each rule's `*_SCALE`
 * documents the saturation distance from threshold → confidence 1.0.
 */
export type RuleConfig = {
  // --- Guatemala LCE legal bands (GTQ) ---
  LCE_COMPRA_DIRECTA_MAX: number; // ≤ Q90k: Compra Directa (Art. 43)
  LCE_COTIZACION_MAX: number; // Q90k–Q900k: Cotización (Art. 38)
  CATEGORY_MIN_SAMPLE: number; // min n before UNSPSC-level fallback

  // --- Rule 1: single_bidder ---
  RULE_1_MAX_TENDERERS: number;
  RULE_1_MIN_VALUE_MEDIUM: number;
  RULE_1_MIN_VALUE_HIGH: number;
  RULE_1_SCALE: number;

  // --- Rule 2: low_competition_vs_category ---
  RULE_2_MAX_TENDERERS: number;
  RULE_2_SCALE: number;

  // --- Rule 3: direct_award_overreliance ---
  RULE_3_DIRECT_SHARE_THRESHOLD: number;
  RULE_3_HIGH_THRESHOLD: number;
  RULE_3_MIN_DIRECT_VALUE: number;
  RULE_3_MIN_AWARDS: number;
  RULE_3_SCALE: number;

  // --- Rule 4: highvalue_noncompetitive_method ---
  RULE_4_MIN_VALUE: number;
  RULE_4_SCALE: number;

  // --- Rule 5: disqualification_clears_field ---
  RULE_5_MIN_BIDS: number;
  RULE_5_MAX_VALID_POST_DQ: number;

  // --- Rule 6: failed_then_single_award (best-effort, low confidence) ---
  RULE_6_WINDOW_DAYS: number;
  RULE_6_MAX_CONFIDENCE: number;

  // --- Rule 7: supplier_concentration_per_buyer (HERO) ---
  RULE_7_SHARE_THRESHOLD: number;
  RULE_7_HIGH_THRESHOLD: number;
  RULE_7_MIN_TOTAL: number;
  RULE_7_MIN_AWARDS: number;
  RULE_7_SCALE: number;

  // --- Rule 8: buyer_dependence_on_supplier ---
  RULE_8_COUNT_SHARE_THRESHOLD: number;
  RULE_8_HIGH_THRESHOLD: number;
  RULE_8_MIN_AWARDS: number;
  RULE_8_SCALE: number;

  // --- Rule 9: supplier_cross_categories ---
  RULE_9_MIN_FAMILIES: number;
  RULE_9_MIN_TOTAL: number;
  RULE_9_SCALE: number;

  // --- Rule 10: repeat_winner_same_competitors ---
  RULE_10_MIN_SET_SIZE: number;
  RULE_10_MIN_RECURRENCE: number;
  RULE_10_MIN_WIN_RATE: number;
  RULE_10_SCALE: number;

  // --- Rule 11: new_supplier_large_first_award ---
  RULE_11_MIN_VALUE: number;
  RULE_11_SCALE: number;

  // --- Rule 12: individual_large_contract ---
  RULE_12_MIN_VALUE: number;
  RULE_12_SCALE: number;

  // --- Rule 13: price_outlier_vs_category ---
  RULE_13_IQR_MULT: number;
  RULE_13_MEDIAN_MULT: number;
  RULE_13_HIGH_MEDIAN_MULT: number;
  RULE_13_SCALE: number;

  // --- Rule 14: buyer_overpays_vs_peers ---
  RULE_14_PEER_MULT: number;
  RULE_14_MIN_BUYER_AWARDS: number;
  RULE_14_SCALE: number;

  // --- Rule 15: threshold_hugging ---
  RULE_15_BAND_FLOOR_FRACTION: number;
  RULE_15_SCALE: number;

  // --- Rule 16: above_supplier_history_avg ---
  RULE_16_HIST_MULT: number;
  RULE_16_MIN_PRIOR_AWARDS: number;
  RULE_16_SCALE: number;

  // --- Rule 17: low_discount_winner ---
  RULE_17_MIN_VALID_BIDS: number;
  RULE_17_WINNER_RATIO: number;
  RULE_17_OTHERS_SPREAD: number;
  RULE_17_SCALE: number;

  // --- Rule 18: contract_splitting (HIGH) ---
  RULE_18_WINDOW_DAYS: number;
  RULE_18_MIN_AWARDS: number;
  RULE_18_PER_AWARD_MAX: number;
  RULE_18_SCALE: number;

  // --- Rule 19: burst_clustering ---
  RULE_19_WINDOW_DAYS: number;
  RULE_19_BURST_MULT: number;
  RULE_19_MIN_AWARDS: number;
  RULE_19_SCALE: number;

  // --- Rule 20: short_tender_period ---
  RULE_20_MIN_DAYS: number;
  RULE_20_MIN_VALUE: number;
  RULE_20_SCALE: number;

  // --- Rule 21: fast_award_after_publication ---
  RULE_21_MAX_DAYS: number;
  RULE_21_MIN_VALUE: number;
  RULE_21_SCALE: number;

  // --- Rule 22: weak_documentation ---
  RULE_22_MAX_DOC_COUNT: number;
  RULE_22_MIN_VALUE: number;
  RULE_22_SCALE: number;

  // --- Rule 23: cancelled_then_reaward ---
  RULE_23_SCALE: number;
};

export const defaultRuleConfig: RuleConfig = {
  LCE_COMPRA_DIRECTA_MAX: 90_000,
  LCE_COTIZACION_MAX: 900_000,
  CATEGORY_MIN_SAMPLE: 8,

  // 1 single_bidder — numberOfTenderers ≤ 1; med if ≥90k, high if ≥900k.
  RULE_1_MAX_TENDERERS: 1,
  RULE_1_MIN_VALUE_MEDIUM: 90_000,
  RULE_1_MIN_VALUE_HIGH: 900_000,
  RULE_1_SCALE: 900_000,

  // 2 low_competition_vs_category — count < family p25 AND ≤ 2.
  RULE_2_MAX_TENDERERS: 2,
  RULE_2_SCALE: 2,

  // 3 direct_award_overreliance — share ≥ 0.98 AND directValue ≥ 1M AND ≥ 5;
  // high if share ≥ 1.0 (100%).
  RULE_3_DIRECT_SHARE_THRESHOLD: 0.98,
  RULE_3_HIGH_THRESHOLD: 1,
  RULE_3_MIN_DIRECT_VALUE: 1_000_000,
  RULE_3_MIN_AWARDS: 5,
  RULE_3_SCALE: 0.02,

  // 4 highvalue_noncompetitive_method — value ≥ 900k AND noncompetitive → high.
  RULE_4_MIN_VALUE: 900_000,
  RULE_4_SCALE: 900_000,

  // 5 disqualification_clears_field — ≥3 bids, exactly 1 valid post-DQ wins.
  RULE_5_MIN_BIDS: 3,
  RULE_5_MAX_VALID_POST_DQ: 1,

  // 6 failed_then_single_award — best-effort; low confidence (caveat).
  RULE_6_WINDOW_DAYS: 90,
  RULE_6_MAX_CONFIDENCE: 0.3,

  // 7 supplier_concentration_per_buyer (HERO) — share ≥0.50 (high ≥0.65),
  // total ≥1M, ≥5 awards.
  RULE_7_SHARE_THRESHOLD: 0.5,
  RULE_7_HIGH_THRESHOLD: 0.65,
  RULE_7_MIN_TOTAL: 1_000_000,
  RULE_7_MIN_AWARDS: 5,
  RULE_7_SCALE: 0.5,

  // 8 buyer_dependence_on_supplier — count-share ≥0.50 (high ≥0.65), ≥5.
  RULE_8_COUNT_SHARE_THRESHOLD: 0.5,
  RULE_8_HIGH_THRESHOLD: 0.65,
  RULE_8_MIN_AWARDS: 5,
  RULE_8_SCALE: 0.5,

  // 9 supplier_cross_categories — ≥4 distinct families AND total ≥500k.
  RULE_9_MIN_FAMILIES: 4,
  RULE_9_MIN_TOTAL: 500_000,
  RULE_9_SCALE: 4,

  // 10 repeat_winner_same_competitors — set(≥2) recurs ≥3, one wins ≥70%.
  RULE_10_MIN_SET_SIZE: 2,
  RULE_10_MIN_RECURRENCE: 3,
  RULE_10_MIN_WIN_RATE: 0.7,
  RULE_10_SCALE: 3,

  // 11 new_supplier_large_first_award — first award in scope AND ≥900k.
  RULE_11_MIN_VALUE: 900_000,
  RULE_11_SCALE: 900_000,

  // 12 individual_large_contract — individual AND ≥ cohort p90 AND ≥90k.
  RULE_12_MIN_VALUE: 90_000,
  RULE_12_SCALE: 90_000,

  // 13 price_outlier_vs_category — > p75 + 1.5·IQR OR ≥3× median (high ≥5×).
  RULE_13_IQR_MULT: 1.5,
  RULE_13_MEDIAN_MULT: 3,
  RULE_13_HIGH_MEDIAN_MULT: 5,
  RULE_13_SCALE: 2,

  // 14 buyer_overpays_vs_peers — buyer mean ≥2× peer median; ≥5 buyer awards.
  RULE_14_PEER_MULT: 2,
  RULE_14_MIN_BUYER_AWARDS: 5,
  RULE_14_SCALE: 2,

  // 15 threshold_hugging — value ∈ [0.95·band, band) for an LCE ceiling.
  RULE_15_BAND_FLOOR_FRACTION: 0.95,
  RULE_15_SCALE: 0.05,

  // 16 above_supplier_history_avg — ≥3× supplier hist avg AND ≥3 prior awards.
  RULE_16_HIST_MULT: 3,
  RULE_16_MIN_PRIOR_AWARDS: 3,
  RULE_16_SCALE: 3,

  // 17 low_discount_winner — ≥3 valid bids; winner/2nd ≥0.98 or winner not
  // lowest; others spread > 10%.
  RULE_17_MIN_VALID_BIDS: 3,
  RULE_17_WINNER_RATIO: 0.98,
  RULE_17_OTHERS_SPREAD: 0.1,
  RULE_17_SCALE: 0.02,

  // 18 contract_splitting (HIGH) — ≥3 awards within 30d, each <90k, sum ≥90k.
  RULE_18_WINDOW_DAYS: 30,
  RULE_18_MIN_AWARDS: 3,
  RULE_18_PER_AWARD_MAX: 90_000,
  RULE_18_SCALE: 3,

  // 19 burst_clustering — buyer 7-day awards ≥3× its weekly median.
  RULE_19_WINDOW_DAYS: 7,
  RULE_19_BURST_MULT: 3,
  RULE_19_MIN_AWARDS: 3,
  RULE_19_SCALE: 3,

  // 20 short_tender_period — endDate present; (end−start) < 3d AND ≥90k.
  RULE_20_MIN_DAYS: 3,
  RULE_20_MIN_VALUE: 90_000,
  RULE_20_SCALE: 3,

  // 21 fast_award_after_publication — (award − published) < 2d AND ≥90k.
  RULE_21_MAX_DAYS: 2,
  RULE_21_MIN_VALUE: 90_000,
  RULE_21_SCALE: 2,

  // 22 weak_documentation — documentsSummary.count ≤1 AND ≥900k.
  RULE_22_MAX_DOC_COUNT: 1,
  RULE_22_MIN_VALUE: 900_000,
  RULE_22_SCALE: 900_000,

  // 23 cancelled_then_reaward — cancelled award + later active award (same ocid).
  RULE_23_SCALE: 1,
};
