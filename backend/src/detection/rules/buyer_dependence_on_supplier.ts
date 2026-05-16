import { registerRule } from '../registry.js';
import { confidence } from '../confidence.js';
import { makeSignal } from '../rule-helpers.js';

// Rule 8 (F2): buyer_dependence_on_supplier — top-supplier *count*-share
// ≥ 0.50 (high ≥ 0.65) AND ≥ 5 awards for the buyer. Reads the buyer rollup's
// supplierCountMap. needsHistory: true.
registerRule({
  id: 'buyer_dependence_on_supplier',
  family: 'F2',
  needsHistory: true,
  run(ctx) {
    const { release, config } = ctx;
    const buyerId = ctx.entities.canonicalOf(release.buyer.id);
    const rollup = ctx.entities.rollup(buyerId);
    if (!rollup || !rollup.supplierCountMap) return [];
    if (rollup.awardCount < config.RULE_8_MIN_AWARDS) return [];

    const totalCount = rollup.awardCount;
    if (totalCount <= 0) return [];

    let topSupplier = '';
    let topCount = 0;
    for (const [sid, c] of Object.entries(rollup.supplierCountMap)) {
      if (c > topCount) {
        topCount = c;
        topSupplier = sid;
      }
    }
    const share = topCount / totalCount;
    if (share < config.RULE_8_COUNT_SHARE_THRESHOLD) return [];

    const severity = share >= config.RULE_8_HIGH_THRESHOLD ? 'high' : 'medium';

    return [
      makeSignal({
        rule_id: 'buyer_dependence_on_supplier',
        ocid: release.ocid,
        family: 'F2',
        severity,
        confidence: confidence(
          share,
          config.RULE_8_COUNT_SHARE_THRESHOLD,
          config.RULE_8_SCALE,
        ),
        title: 'buyer_dependence_on_supplier.title',
        explanation: 'buyer_dependence_on_supplier.explanation',
        story_angle:
          'This institution awards most of its contracts, by count, to the same supplier.',
        evidence: [
          {
            field: 'awards[].supplierIds',
            value: topSupplier,
            comparison: `top-supplier count-share ${share.toFixed(3)} >= ${config.RULE_8_COUNT_SHARE_THRESHOLD}`,
            benchmark: { topCount, totalCount, share },
          },
          {
            field: 'buyer.id',
            value: release.buyer.id,
            comparison: `>= ${config.RULE_8_MIN_AWARDS} awards`,
            benchmark: { awardCount: rollup.awardCount },
          },
        ],
        primaryEntityId: buyerId,
        secondaryEntityIds: [topSupplier],
      }),
    ];
  },
});
