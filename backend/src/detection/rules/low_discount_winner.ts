import { registerRule } from '../registry.js';
import { confidence } from '../confidence.js';
import { makeSignal } from '../rule-helpers.js';

// Rule 17 (F3): low_discount_winner — ≥ 3 valid bids where either the winner's
// bid / 2nd-lowest ≥ 0.98 (almost no discount) OR the winner is not the
// lowest bidder, AND the other bids spread > 10%. Pure intra-release.
// needsHistory: false.
registerRule({
  id: 'low_discount_winner',
  family: 'F3',
  needsHistory: false,
  run(ctx) {
    const { release, config } = ctx;
    if (release.awards.length === 0) return [];
    const validBids = release.bids
      .filter((b) => b.status === 'valid' && b.amount > 0)
      .sort((a, b) => a.amount - b.amount);
    if (validBids.length < config.RULE_17_MIN_VALID_BIDS) return [];

    const winnerIds = new Set(release.awards.flatMap((a) => a.supplierIds));
    const winnerBid = validBids.find((b) => winnerIds.has(b.tendererId));
    if (!winnerBid) return [];

    const lowest = validBids[0]!;
    const secondLowest = validBids[1]!;
    const winnerNotLowest = winnerBid.amount > lowest.amount;
    // winner / next-lowest distinct bid ratio
    const reference =
      winnerBid.tendererId === lowest.tendererId
        ? secondLowest.amount
        : lowest.amount;
    const winnerRatio = reference > 0 ? winnerBid.amount / reference : 0;
    const tightWinner = winnerRatio >= config.RULE_17_WINNER_RATIO;

    const max = validBids[validBids.length - 1]!.amount;
    const min = lowest.amount;
    const spread = min > 0 ? (max - min) / min : 0;
    if (spread <= config.RULE_17_OTHERS_SPREAD) return [];
    if (!winnerNotLowest && !tightWinner) return [];

    const buyerId = ctx.entities.canonicalOf(release.buyer.id);

    return [
      makeSignal({
        rule_id: 'low_discount_winner',
        ocid: release.ocid,
        family: 'F3',
        severity: 'medium',
        confidence: confidence(
          winnerRatio,
          config.RULE_17_WINNER_RATIO,
          config.RULE_17_SCALE,
        ),
        title: 'low_discount_winner.title',
        explanation: 'low_discount_winner.explanation',
        story_angle:
          'Despite a wide spread of bids, the winner offered little or no discount.',
        evidence: [
          {
            field: 'bids[].amount',
            value: {
              winner: winnerBid.amount,
              lowest: lowest.amount,
              spread: Number(spread.toFixed(4)),
            },
            comparison: winnerNotLowest
              ? 'winner is not the lowest bidder'
              : `winner/next ${winnerRatio.toFixed(3)} >= ${config.RULE_17_WINNER_RATIO}`,
          },
          {
            field: 'awards[].value.amount',
            value: release.awards[0]!.value.amount,
          },
        ],
        primaryEntityId: buyerId,
        secondaryEntityIds: [ctx.entities.canonicalOf(winnerBid.tendererId)],
      }),
    ];
  },
});
