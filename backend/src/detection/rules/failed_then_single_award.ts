import { registerRule } from '../registry.js';
import { awardCategory } from '../category.js';
import { daysBetween } from '../rule-helpers.js';
import { makeSignal, firstAwardAmount } from '../rule-helpers.js';

// Rule 6 (F1): failed_then_single_award — best-effort (idea/03 caveat: no
// per-month status history with latest-only storage). Fires when this release
// is a single-supplier single award AND the same buyer+family had a
// Desierto/Prescindido tender within RULE_6_WINDOW_DAYS before this award.
// The prior-failed index is precomputed in benchmarks.failedThenAwardIndex
// keyed "<canonicalBuyerId>|<family>". Confidence is hard-capped at
// RULE_6_MAX_CONFIDENCE. needsHistory: true.
registerRule({
  id: 'failed_then_single_award',
  family: 'F1',
  needsHistory: true,
  run(ctx) {
    const { release, benchmarks, config } = ctx;
    if (release.awards.length !== 1) return [];
    const award = release.awards[0]!;
    if (award.supplierIds.length !== 1) return [];

    const family = awardCategory(release);
    if (family === '') return [];
    const buyerId = ctx.entities.canonicalOf(release.buyer.id);
    const key = `${buyerId}|${family}`;
    const priors = benchmarks.failedThenAwardIndex[key];
    if (!priors || priors.length === 0) return [];

    const match = priors.find((p) => {
      if (p.priorOcid === release.ocid) return false;
      const gap = daysBetween(award.date, p.date);
      return gap !== null && gap >= 0 && gap <= config.RULE_6_WINDOW_DAYS;
    });
    if (!match) return [];

    return [
      makeSignal({
        rule_id: 'failed_then_single_award',
        ocid: release.ocid,
        family: 'F1',
        severity: 'low',
        confidence: config.RULE_6_MAX_CONFIDENCE,
        title: 'failed_then_single_award.title',
        explanation: 'failed_then_single_award.explanation',
        story_angle:
          'A tender that previously failed for this institution and category re-emerged as a single-supplier award.',
        evidence: [
          {
            field: 'tender.statusDetails',
            value: match.statusDetails,
            comparison: `prior failed tender within ${config.RULE_6_WINDOW_DAYS}d (best-effort)`,
            benchmark: { priorOcid: match.priorOcid, priorDate: match.date },
          },
          {
            field: 'awards[].supplierIds',
            value: award.supplierIds,
            comparison: 'single-supplier re-award',
            benchmark: { amount: firstAwardAmount(release) },
          },
        ],
        primaryEntityId: buyerId,
        secondaryEntityIds: award.supplierIds.map((s) =>
          ctx.entities.canonicalOf(s),
        ),
      }),
    ];
  },
});
