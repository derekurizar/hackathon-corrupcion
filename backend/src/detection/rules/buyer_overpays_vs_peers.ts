import { registerRule } from '../registry.js';
import { confidence } from '../confidence.js';
import { awardCategory } from '../category.js';
import { makeSignal, firstAwardAmount } from '../rule-helpers.js';

// Rule 14 (F3): buyer_overpays_vs_peers — this buyer pays ≥ 2× the peer-buyer
// median price for the family, and the buyer has ≥ 5 awards overall.
//
// DEVIATION (recorded): idea/03 specifies "buyer *mean* vs peer-buyer median
// per family", but the frozen Benchmark schema carries no per-buyer-per-family
// aggregate (only peerCategoryMedian[family] and a buyer-wide rollup). The
// smallest correct implementation compares THIS release's award value to
// peerCategoryMedian[family] (a per-release proxy for the buyer's pricing in
// that family) gated by a buyer-level award-count floor. Tightening to a true
// per-buyer-per-family mean is a Phase-4 benchmark-schema extension.
registerRule({
  id: 'buyer_overpays_vs_peers',
  family: 'F3',
  needsHistory: true,
  run(ctx) {
    const { release, benchmarks, config } = ctx;
    if (release.awards.length === 0) return [];
    const family = awardCategory(release);
    if (family === '') return [];
    const peerMedian = benchmarks.peerCategoryMedian[family];
    if (peerMedian === undefined || peerMedian <= 0) return [];

    const buyerId = ctx.entities.canonicalOf(release.buyer.id);
    const rollup = ctx.entities.rollup(buyerId);
    if (!rollup || rollup.awardCount < config.RULE_14_MIN_BUYER_AWARDS) return [];

    const amount = firstAwardAmount(release);
    const mult = amount / peerMedian;
    if (mult < config.RULE_14_PEER_MULT) return [];

    return [
      makeSignal({
        rule_id: 'buyer_overpays_vs_peers',
        ocid: release.ocid,
        family: 'F3',
        severity: 'medium',
        confidence: confidence(mult, config.RULE_14_PEER_MULT, config.RULE_14_SCALE),
        title: 'buyer_overpays_vs_peers.title',
        explanation: 'buyer_overpays_vs_peers.explanation',
        story_angle:
          'This institution pays well above what peer institutions pay for comparable items.',
        evidence: [
          {
            field: 'awards[].value.amount',
            value: amount,
            comparison: `${mult.toFixed(2)}x peer-buyer median for family ${family}`,
            benchmark: { family, peerCategoryMedian: peerMedian },
          },
          {
            field: 'buyer.id',
            value: release.buyer.id,
            comparison: `>= ${config.RULE_14_MIN_BUYER_AWARDS} buyer awards`,
            benchmark: { awardCount: rollup.awardCount },
          },
        ],
        primaryEntityId: buyerId,
        secondaryEntityIds: release.awards[0]!.supplierIds.map((s) =>
          ctx.entities.canonicalOf(s),
        ),
      }),
    ];
  },
});
