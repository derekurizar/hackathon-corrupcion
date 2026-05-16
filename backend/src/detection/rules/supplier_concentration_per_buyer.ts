import { registerRule } from '../registry.js';
import { confidence } from '../confidence.js';
import { makeSignal } from '../rule-helpers.js';

// Rule 7 (F2, HERO): supplier_concentration_per_buyer — for the buyer of this
// release, the single supplier capturing the largest value-share ≥ 0.50
// (high ≥ 0.65), buyer total awarded value ≥ 1M, and ≥ 5 awards. Reads the
// buyer rollup's supplierValueMap (built in-memory; raw→canonical resolved by
// build-benchmarks). One signal per release of a concentrated buyer.
// needsHistory: true.
registerRule({
  id: 'supplier_concentration_per_buyer',
  family: 'F2',
  needsHistory: true,
  run(ctx) {
    const { release, config } = ctx;
    const buyerId = ctx.entities.canonicalOf(release.buyer.id);
    const rollup = ctx.entities.rollup(buyerId);
    if (!rollup || !rollup.supplierValueMap) return [];
    if (rollup.awardCount < config.RULE_7_MIN_AWARDS) return [];

    const total = rollup.awardValue;
    if (total < config.RULE_7_MIN_TOTAL || total <= 0) return [];

    let topSupplier = '';
    let topValue = 0;
    for (const [sid, v] of Object.entries(rollup.supplierValueMap)) {
      if (v > topValue) {
        topValue = v;
        topSupplier = sid;
      }
    }
    const share = topValue / total;
    if (share < config.RULE_7_SHARE_THRESHOLD) return [];

    const severity = share >= config.RULE_7_HIGH_THRESHOLD ? 'high' : 'medium';

    return [
      makeSignal({
        rule_id: 'supplier_concentration_per_buyer',
        ocid: release.ocid,
        family: 'F2',
        severity,
        confidence: confidence(share, config.RULE_7_SHARE_THRESHOLD, config.RULE_7_SCALE),
        title: 'supplier_concentration_per_buyer.title',
        explanation: 'supplier_concentration_per_buyer.explanation',
        story_angle:
          'A single supplier captures the majority of this institution’s contracting value.',
        evidence: [
          {
            field: 'awards[].supplierIds',
            value: topSupplier,
            comparison: `top-supplier value-share ${share.toFixed(3)} >= ${config.RULE_7_SHARE_THRESHOLD}`,
            benchmark: { topValue, total, share },
          },
          {
            field: 'awards[].value.amount',
            value: total,
            comparison: `buyer total >= ${config.RULE_7_MIN_TOTAL}`,
          },
          {
            field: 'buyer.id',
            value: release.buyer.id,
            comparison: `>= ${config.RULE_7_MIN_AWARDS} awards`,
            benchmark: { awardCount: rollup.awardCount },
          },
        ],
        primaryEntityId: buyerId,
        secondaryEntityIds: [topSupplier],
      }),
    ];
  },
});
