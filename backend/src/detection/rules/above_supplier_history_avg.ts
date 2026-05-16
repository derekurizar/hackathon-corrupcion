import { registerRule } from '../registry.js';
import { confidence } from '../confidence.js';
import { makeSignal } from '../rule-helpers.js';

// Rule 16 (F3): above_supplier_history_avg — an award ≥ 3× the supplier's own
// historical average value, where the supplier has ≥ 3 prior awards. Reads
// the supplier rollup (historyAvgValue, awardCount). needsHistory: true.
registerRule({
  id: 'above_supplier_history_avg',
  family: 'F3',
  needsHistory: true,
  run(ctx) {
    const { release, config } = ctx;
    if (release.awards.length === 0) return [];
    const buyerId = ctx.entities.canonicalOf(release.buyer.id);

    const seen = new Set<string>();
    const out = [];
    for (const award of release.awards) {
      for (const rawSid of award.supplierIds) {
        const sid = ctx.entities.canonicalOf(rawSid);
        if (seen.has(sid)) continue;
        seen.add(sid);
        const rollup = ctx.entities.rollup(sid);
        if (!rollup) continue;
        // "≥ 3 prior awards" → at least RULE_16_MIN_PRIOR_AWARDS in history
        // besides this one.
        if (rollup.awardCount < config.RULE_16_MIN_PRIOR_AWARDS + 1) continue;
        const avg = rollup.historyAvgValue;
        if (avg <= 0) continue;
        const mult = award.value.amount / avg;
        if (mult < config.RULE_16_HIST_MULT) continue;

        out.push(
          makeSignal({
            rule_id: 'above_supplier_history_avg',
            ocid: release.ocid,
            family: 'F3',
            severity: 'medium',
            confidence: confidence(
              mult,
              config.RULE_16_HIST_MULT,
              config.RULE_16_SCALE,
            ),
            title: 'above_supplier_history_avg.title',
            explanation: 'above_supplier_history_avg.explanation',
            story_angle:
              'This award is several times larger than anything this supplier has previously received.',
            evidence: [
              {
                field: 'awards[].value.amount',
                value: award.value.amount,
                comparison: `${mult.toFixed(2)}x supplier history avg`,
                benchmark: {
                  historyAvgValue: avg,
                  awardCount: rollup.awardCount,
                },
              },
            ],
            primaryEntityId: buyerId,
            secondaryEntityIds: [sid],
          }),
        );
      }
    }
    return out;
  },
});
