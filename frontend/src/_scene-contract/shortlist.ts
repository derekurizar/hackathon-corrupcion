import type { Chapter } from './types.js';
import type { SceneSignal } from './types.js';

export type RuleFamily = 'F1' | 'F2' | 'F3' | 'F4';

/**
 * The 23-rule catalog (transcribed verbatim from idea/03 §"The 23-rule
 * catalog"). `id` is the real `Signal.rule_id` *string name*; `ordinal` is
 * the catalog ordinal (1–23) used by the deterministic shortlist table.
 *
 * Area 03's `Signal.rule_id` is a STRING (e.g. `'single_bidder'`), NOT a
 * number — the numbers in idea/05 are catalog ordinals. `ruleOrdinalsFromSignals`
 * bridges real signal ids to ordinals.
 *
 * Family bands: F1=1–6, F2=7–12, F3=13–17, F4=18–23.
 */
export const RULE_CATALOG: readonly {
  ordinal: number;
  id: string;
  family: RuleFamily;
}[] = [
  // F1 — Competition & method abuse
  { ordinal: 1, id: 'single_bidder', family: 'F1' },
  { ordinal: 2, id: 'low_competition_vs_category', family: 'F1' },
  { ordinal: 3, id: 'direct_award_overreliance', family: 'F1' },
  { ordinal: 4, id: 'highvalue_noncompetitive_method', family: 'F1' },
  { ordinal: 5, id: 'disqualification_clears_field', family: 'F1' },
  { ordinal: 6, id: 'failed_then_single_award', family: 'F1' },
  // F2 — Supplier concentration & networks
  { ordinal: 7, id: 'supplier_concentration_per_buyer', family: 'F2' },
  { ordinal: 8, id: 'buyer_dependence_on_supplier', family: 'F2' },
  { ordinal: 9, id: 'supplier_cross_categories', family: 'F2' },
  { ordinal: 10, id: 'repeat_winner_same_competitors', family: 'F2' },
  { ordinal: 11, id: 'new_supplier_large_first_award', family: 'F2' },
  { ordinal: 12, id: 'individual_large_contract', family: 'F2' },
  // F3 — Pricing anomalies
  { ordinal: 13, id: 'price_outlier_vs_category', family: 'F3' },
  { ordinal: 14, id: 'buyer_overpays_vs_peers', family: 'F3' },
  { ordinal: 15, id: 'threshold_hugging', family: 'F3' },
  { ordinal: 16, id: 'above_supplier_history_avg', family: 'F3' },
  { ordinal: 17, id: 'low_discount_winner', family: 'F3' },
  // F4 — Timing, splitting & integrity
  { ordinal: 18, id: 'contract_splitting', family: 'F4' },
  { ordinal: 19, id: 'burst_clustering', family: 'F4' },
  { ordinal: 20, id: 'short_tender_period', family: 'F4' },
  { ordinal: 21, id: 'fast_award_after_publication', family: 'F4' },
  { ordinal: 22, id: 'weak_documentation', family: 'F4' },
  { ordinal: 23, id: 'cancelled_then_reaward', family: 'F4' },
];

/** Family for a catalog ordinal (1–6=F1, 7–12=F2, 13–17=F3, 18–23=F4). */
export function ruleFamily(ordinal: number): RuleFamily | undefined {
  if (ordinal >= 1 && ordinal <= 6) return 'F1';
  if (ordinal >= 7 && ordinal <= 12) return 'F2';
  if (ordinal >= 13 && ordinal <= 17) return 'F3';
  if (ordinal >= 18 && ordinal <= 23) return 'F4';
  return undefined;
}

/**
 * Bridges real `Signal.rule_id` strings → catalog ordinals for the shortlist.
 * Unknown rule ids are dropped; result is deduped, order not significant.
 */
export function ruleOrdinalsFromSignals(signals: SceneSignal[]): number[] {
  return [
    ...new Set(
      signals
        .map((s) => RULE_CATALOG.find((r) => r.id === s.rule_id)?.ordinal)
        .filter((n): n is number => n !== undefined),
    ),
  ];
}

/**
 * Deterministic scene shortlist per chapter (idea/05 §173). The FIRST entry
 * is the guaranteed default — the LLM may only pick a `sceneId` from this list.
 */
export function shortlist(
  chapter: Chapter,
  firedRuleIds: number[],
  opts?: { hasBenchmark?: boolean; hasRegion?: boolean },
): string[] {
  const fired = new Set(firedRuleIds);
  const has = (...ords: number[]): boolean => ords.some((o) => fired.has(o));

  switch (chapter) {
    case 'cover':
      return ['CoverHeadline'];
    case 'cierre':
      return ['ClosingStatement'];
    case 'elCaso':
      // CaseSplit always allowed.
      return ['CaseStatement', 'CaseSplit'];
    case 'sigueElDinero': {
      const out = ['MoneyFlowStreams'];
      if (has(13, 14)) out.push('PriceBars');
      if (has(15, 18)) out.push('ThresholdLadder');
      if (opts?.hasRegion) out.push('RegionMap'); // stretch
      return out;
    }
    case 'lasConexiones': {
      const out = ['ConcentrationFan'];
      if (has(18)) out.push('SplittingCluster');
      if (has(10)) out.push('RepeatBidders');
      return out;
    }
    case 'evidencia': {
      const out = ['EvidenceLedger'];
      if (opts?.hasBenchmark) out.push('EvidenceCompare');
      return out;
    }
    case 'cronologia': {
      const out = ['AwardTimeline'];
      if (has(20, 21)) out.push('GapSpotlight');
      return out;
    }
  }
}

/** The guaranteed default scene for a chapter (shortlist with no rules). */
export function defaultScene(chapter: Chapter): string {
  return shortlist(chapter, [])[0]!;
}
