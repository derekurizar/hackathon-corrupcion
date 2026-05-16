import { registerRule } from '../registry.js';
import { confidence } from '../confidence.js';
import { makeSignal, firstAwardAmount } from '../rule-helpers.js';

// Rule 22 (F4): weak_documentation — documentsSummary.count ≤ 1 AND award
// value ≥ Q900k. Guard: documentsSummary.firstDatePublished !== '' (the ''
// sentinel means "no documents at all" — a different, weaker condition we do
// not treat as a documentation-quality signal here). needsHistory: false.
registerRule({
  id: 'weak_documentation',
  family: 'F4',
  needsHistory: false,
  run(ctx) {
    const { release, config } = ctx;
    if (release.awards.length === 0) return [];
    const summary = release.tender.documentsSummary;
    if (summary.firstDatePublished === '') return []; // sentinel guard
    if (summary.count > config.RULE_22_MAX_DOC_COUNT) return [];

    const amount = firstAwardAmount(release);
    if (amount < config.RULE_22_MIN_VALUE) return [];

    const buyerId = ctx.entities.canonicalOf(release.buyer.id);

    return [
      makeSignal({
        rule_id: 'weak_documentation',
        ocid: release.ocid,
        family: 'F4',
        severity: 'medium',
        confidence: confidence(amount, config.RULE_22_MIN_VALUE, config.RULE_22_SCALE),
        title: 'weak_documentation.title',
        explanation: 'weak_documentation.explanation',
        story_angle: 'A high-value contract was awarded with almost no supporting documentation.',
        evidence: [
          {
            field: 'tender.documentsSummary.count',
            value: summary.count,
            comparison: `<= ${config.RULE_22_MAX_DOC_COUNT}`,
            benchmark: {
              types: summary.types,
              firstDatePublished: summary.firstDatePublished,
            },
          },
          {
            field: 'awards[].value.amount',
            value: amount,
            comparison: `>= ${config.RULE_22_MIN_VALUE}`,
          },
        ],
        primaryEntityId: buyerId,
        secondaryEntityIds: release.awards[0]!.supplierIds.map((s) => ctx.entities.canonicalOf(s)),
      }),
    ];
  },
});
