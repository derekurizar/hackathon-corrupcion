import { registerRule } from '../registry.js';
import { confidence } from '../confidence.js';
import { makeSignal } from '../rule-helpers.js';

// Rule 19 (F4): burst_clustering — a buyer whose busiest week runs ≥ 3× its
// own weekly median award count.
//
// DEVIATION (recorded): idea/03 frames this as "the 7-day window AROUND this
// release ≥ 3× the buyer weekly median". The frozen Benchmark schema carries
// only per-buyer median + p75 weekly counts (buyerWeeklyBaseline), not a
// per-week bucket index, and the per-release engine has no cross-release
// timeline. The smallest correct implementation uses p75 as the proxy for the
// buyer's burst weeks (p75 ≥ burstMult·median ⇒ the buyer DOES have bursty
// weeks) gated by an absolute floor. A true per-window count is a Phase-4
// benchmark-schema extension (store weekly buckets).
registerRule({
  id: 'burst_clustering',
  family: 'F4',
  needsHistory: true,
  run(ctx) {
    const { release, benchmarks, config } = ctx;
    const buyerId = ctx.entities.canonicalOf(release.buyer.id);
    const baseline = benchmarks.buyerWeeklyBaseline[buyerId];
    if (!baseline) return [];

    const med = baseline.medianWeeklyAwardCount;
    const peak = baseline.p75WeeklyAwardCount;
    if (peak < config.RULE_19_MIN_AWARDS) return [];
    if (med <= 0) return [];
    const mult = peak / med;
    if (mult < config.RULE_19_BURST_MULT) return [];

    return [
      makeSignal({
        rule_id: 'burst_clustering',
        ocid: release.ocid,
        family: 'F4',
        severity: 'medium',
        confidence: confidence(mult, config.RULE_19_BURST_MULT, config.RULE_19_SCALE),
        title: 'burst_clustering.title',
        explanation: 'burst_clustering.explanation',
        story_angle:
          'This institution concentrates a burst of awards into short windows rather than spreading them out.',
        evidence: [
          {
            field: 'awards[].date',
            value: {
              medianWeekly: med,
              peakWeekly: peak,
              mult: Number(mult.toFixed(2)),
            },
            comparison: `peak weekly ${mult.toFixed(2)}x median (>= ${config.RULE_19_BURST_MULT}x)`,
          },
          { field: 'buyer.id', value: release.buyer.id },
        ],
        primaryEntityId: buyerId,
      }),
    ];
  },
});
