import { registerRule } from '../registry.js';
import { confidence } from '../confidence.js';
import { makeSignal, daysBetween, firstAwardAmount } from '../rule-helpers.js';

// Rule 21 (F4): fast_award_after_publication — (awards[0].date −
// tender.datePublished) < 2 days AND award value ≥ Q90k. needsHistory: false.
registerRule({
  id: 'fast_award_after_publication',
  family: 'F4',
  needsHistory: false,
  run(ctx) {
    const { release, config } = ctx;
    if (release.awards.length === 0) return [];
    const award = release.awards[0]!;
    const elapsed = daysBetween(award.date, release.tender.datePublished);
    if (elapsed === null || elapsed < 0) return [];
    if (elapsed >= config.RULE_21_MAX_DAYS) return [];

    const amount = firstAwardAmount(release);
    if (amount < config.RULE_21_MIN_VALUE) return [];

    const buyerId = ctx.entities.canonicalOf(release.buyer.id);

    return [
      makeSignal({
        rule_id: 'fast_award_after_publication',
        ocid: release.ocid,
        family: 'F4',
        severity: 'medium',
        confidence: confidence(config.RULE_21_MAX_DAYS - elapsed, 0, config.RULE_21_SCALE),
        title: 'fast_award_after_publication.title',
        explanation: 'fast_award_after_publication.explanation',
        story_angle:
          'The award landed almost immediately after publication, leaving little room for genuine competition.',
        evidence: [
          {
            field: 'tender.datePublished',
            value: {
              datePublished: release.tender.datePublished,
              awardDate: award.date,
              elapsedDays: Number(elapsed.toFixed(2)),
            },
            comparison: `< ${config.RULE_21_MAX_DAYS}d`,
          },
          {
            field: 'awards[].value.amount',
            value: amount,
            comparison: `>= ${config.RULE_21_MIN_VALUE}`,
          },
        ],
        primaryEntityId: buyerId,
        secondaryEntityIds: award.supplierIds.map((s) => ctx.entities.canonicalOf(s)),
      }),
    ];
  },
});
