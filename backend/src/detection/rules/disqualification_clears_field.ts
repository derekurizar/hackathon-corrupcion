import { registerRule } from '../registry.js';
import { confidence } from '../confidence.js';
import { makeSignal } from '../rule-helpers.js';

// Rule 5 (F1): disqualification_clears_field — ≥ 3 bids, exactly 1 valid bid
// remaining after disqualifications, and that surviving bidder wins. Pure
// intra-release (bids[].tendererId and awards[].supplierIds are both the RAW
// OrganizationReference id, so they join directly — see normalize.ts).
// needsHistory: false.
registerRule({
  id: 'disqualification_clears_field',
  family: 'F1',
  needsHistory: false,
  run(ctx) {
    const { release, config } = ctx;
    if (release.bids.length < config.RULE_5_MIN_BIDS) return [];
    if (release.awards.length === 0) return [];

    const valid = release.bids.filter((b) => b.status === 'valid');
    const disqualified = release.bids.filter((b) => b.status === 'disqualified');
    if (disqualified.length === 0) return [];
    if (valid.length !== config.RULE_5_MAX_VALID_POST_DQ) return [];

    const survivor = valid[0]!;
    const winnerIds = new Set(release.awards.flatMap((a) => a.supplierIds));
    if (!winnerIds.has(survivor.tendererId)) return [];

    const buyerId = ctx.entities.canonicalOf(release.buyer.id);

    return [
      makeSignal({
        rule_id: 'disqualification_clears_field',
        ocid: release.ocid,
        family: 'F1',
        severity: 'high',
        confidence: confidence(disqualified.length, 0, release.bids.length),
        title: 'disqualification_clears_field.title',
        explanation: 'disqualification_clears_field.explanation',
        story_angle:
          'Competitors were disqualified until a single bidder remained — and that bidder won.',
        evidence: [
          {
            field: 'bids[].status',
            value: {
              total: release.bids.length,
              valid: valid.length,
              disqualified: disqualified.length,
            },
            comparison: `>= ${config.RULE_5_MIN_BIDS} bids, exactly ${config.RULE_5_MAX_VALID_POST_DQ} valid post-DQ`,
          },
          {
            field: 'awards[].supplierIds',
            value: survivor.tendererId,
            comparison: 'sole surviving bidder is the awarded supplier',
          },
        ],
        primaryEntityId: buyerId,
        secondaryEntityIds: [ctx.entities.canonicalOf(survivor.tendererId)],
      }),
    ];
  },
});
