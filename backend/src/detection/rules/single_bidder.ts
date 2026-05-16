import { registerRule } from '../registry.js';
import { confidence } from '../confidence.js';
import { makeSignal, firstAwardAmount } from '../rule-helpers.js';

// Rule 1 (F1): single_bidder — numberOfTenderers ≤ 1; severity medium if the
// award value ≥ Q90k, high if ≥ Q900k. needsHistory: false.
registerRule({
  id: 'single_bidder',
  family: 'F1',
  needsHistory: false,
  run(ctx) {
    const { release, config } = ctx;
    if (release.awards.length === 0) return [];
    if (release.tender.numberOfTenderers > config.RULE_1_MAX_TENDERERS) return [];

    const amount = firstAwardAmount(release);
    if (amount < config.RULE_1_MIN_VALUE_MEDIUM) return [];

    const severity =
      amount >= config.RULE_1_MIN_VALUE_HIGH ? 'high' : 'medium';
    const buyerId = ctx.entities.canonicalOf(release.buyer.id);
    const suppliers = release.awards[0]!.supplierIds.map((s) =>
      ctx.entities.canonicalOf(s),
    );

    return [
      makeSignal({
        rule_id: 'single_bidder',
        ocid: release.ocid,
        family: 'F1',
        severity,
        confidence: confidence(
          amount,
          config.RULE_1_MIN_VALUE_MEDIUM,
          config.RULE_1_SCALE,
        ),
        title: 'single_bidder.title',
        explanation: 'single_bidder.explanation',
        story_angle:
          'An open tender that drew at most one bidder still resulted in a large award.',
        evidence: [
          {
            field: 'tender.numberOfTenderers',
            value: release.tender.numberOfTenderers,
            comparison: `<= ${config.RULE_1_MAX_TENDERERS}`,
          },
          {
            field: 'awards[].value.amount',
            value: amount,
            comparison:
              severity === 'high'
                ? `>= ${config.RULE_1_MIN_VALUE_HIGH}`
                : `>= ${config.RULE_1_MIN_VALUE_MEDIUM}`,
          },
        ],
        primaryEntityId: buyerId,
        secondaryEntityIds: suppliers,
      }),
    ];
  },
});
