import { registerRule } from '../registry.js';
import { confidence } from '../confidence.js';
import { makeSignal, daysBetween, firstAwardAmount } from '../rule-helpers.js';

// Rule 20 (F4): short_tender_period — ONLY when tenderPeriod.endDate is
// present (~25% of records; absence is NOT a signal). Fires if
// (endDate − startDate) < 3 days AND award value ≥ Q90k. needsHistory: false.
registerRule({
  id: 'short_tender_period',
  family: 'F4',
  needsHistory: false,
  run(ctx) {
    const { release, config } = ctx;
    const period = release.tender.tenderPeriod;
    if (period.endDate === null) return []; // endDate-gated
    if (release.awards.length === 0) return [];

    const days = daysBetween(period.endDate, period.startDate);
    if (days === null || days < 0) return [];
    if (days >= config.RULE_20_MIN_DAYS) return [];

    const amount = firstAwardAmount(release);
    if (amount < config.RULE_20_MIN_VALUE) return [];

    const buyerId = ctx.entities.canonicalOf(release.buyer.id);

    return [
      makeSignal({
        rule_id: 'short_tender_period',
        ocid: release.ocid,
        family: 'F4',
        severity: 'medium',
        confidence: confidence(config.RULE_20_MIN_DAYS - days, 0, config.RULE_20_SCALE),
        title: 'short_tender_period.title',
        explanation: 'short_tender_period.explanation',
        story_angle:
          'Bidders had only a sliver of time to respond before this contract was awarded.',
        evidence: [
          {
            field: 'tender.tenderPeriod.endDate',
            value: { startDate: period.startDate, endDate: period.endDate },
            comparison: `period ${days.toFixed(2)}d < ${config.RULE_20_MIN_DAYS}d`,
          },
          {
            field: 'awards[].value.amount',
            value: amount,
            comparison: `>= ${config.RULE_20_MIN_VALUE}`,
          },
        ],
        primaryEntityId: buyerId,
        secondaryEntityIds: release.awards[0]!.supplierIds.map((s) => ctx.entities.canonicalOf(s)),
      }),
    ];
  },
});
