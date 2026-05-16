import { registerRule } from '../registry.js';
import { confidence } from '../confidence.js';
import { isDirectMethod } from '../method.js';
import { makeSignal } from '../rule-helpers.js';

// Rule 3 (F1): direct_award_overreliance — a buyer whose Compra-Directa
// value-share ≥ 0.98 AND direct value ≥ 1M AND ≥ 5 awards. This is a
// buyer-level pattern; in the per-release engine it fires once per release of
// an over-reliant buyer (the analyst sees it in-context). The buyer's
// method-share comes from benchmarks.buyerMethodMix; the award count/value
// from the buyer rollup. needsHistory: true.
registerRule({
  id: 'direct_award_overreliance',
  family: 'F1',
  needsHistory: true,
  run(ctx) {
    const { release, benchmarks, config } = ctx;
    const buyerId = ctx.entities.canonicalOf(release.buyer.id);
    const mix = benchmarks.buyerMethodMix[buyerId];
    if (!mix) return [];

    // Aggregate the value-share across all direct-method labels.
    let directValueShare = 0;
    const directLabels: string[] = [];
    for (const [method, shares] of Object.entries(mix)) {
      if (isDirectMethod(method)) {
        directValueShare += shares.valueShare;
        directLabels.push(method);
      }
    }
    if (directValueShare < config.RULE_3_DIRECT_SHARE_THRESHOLD) return [];

    const rollup = ctx.entities.rollup(buyerId);
    if (!rollup) return [];
    if (rollup.awardCount < config.RULE_3_MIN_AWARDS) return [];
    const directValue = rollup.awardValue * directValueShare;
    if (directValue < config.RULE_3_MIN_DIRECT_VALUE) return [];

    const severity =
      directValueShare >= config.RULE_3_HIGH_THRESHOLD ? 'high' : 'medium';

    return [
      makeSignal({
        rule_id: 'direct_award_overreliance',
        ocid: release.ocid,
        family: 'F1',
        severity,
        confidence: confidence(
          directValueShare,
          config.RULE_3_DIRECT_SHARE_THRESHOLD,
          config.RULE_3_SCALE,
        ),
        title: 'direct_award_overreliance.title',
        explanation: 'direct_award_overreliance.explanation',
        story_angle:
          'This institution routes almost all of its spending through direct purchase, sidestepping open competition.',
        evidence: [
          {
            field: 'tender.procurementMethodDetails',
            value: release.tender.procurementMethodDetails,
            comparison: `direct value-share >= ${config.RULE_3_DIRECT_SHARE_THRESHOLD}`,
            benchmark: { directValueShare, directLabels },
          },
          {
            field: 'buyer.id',
            value: release.buyer.id,
            comparison: `>= ${config.RULE_3_MIN_AWARDS} awards, direct value >= ${config.RULE_3_MIN_DIRECT_VALUE}`,
            benchmark: {
              awardCount: rollup.awardCount,
              directValue,
            },
          },
        ],
        primaryEntityId: buyerId,
      }),
    ];
  },
});
