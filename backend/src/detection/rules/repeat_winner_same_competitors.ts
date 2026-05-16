import { registerRule } from '../registry.js';
import { confidence } from '../confidence.js';
import { makeSignal } from '../rule-helpers.js';

/** Stable key for a tenderer set (raw ids, sorted, joined). */
function setKey(ids: string[]): string {
  return [...new Set(ids)].sort().join(',');
}

// Rule 10 (F2): repeat_winner_same_competitors — a recurring set of ≥ 2
// bidders that appears ≥ 3 times for the same buyer where one bidder wins
// ≥ 70% of the time. Patterns are precomputed in benchmarks.repeatWinnerIndex
// keyed by canonical buyer id. This release fires if its bidder set matches a
// qualifying pattern. needsHistory: true.
registerRule({
  id: 'repeat_winner_same_competitors',
  family: 'F2',
  needsHistory: true,
  run(ctx) {
    const { release, benchmarks, config } = ctx;
    if (release.bids.length < config.RULE_10_MIN_SET_SIZE) return [];
    const buyerId = ctx.entities.canonicalOf(release.buyer.id);
    const entry = benchmarks.repeatWinnerIndex[buyerId];
    if (!entry) return [];

    const thisSet = setKey(
      release.bids.map((b) => b.tendererId).filter((x) => x !== ''),
    );
    if (thisSet === '') return [];

    for (const pattern of entry.tendererSets) {
      if (pattern.tendererIds.length < config.RULE_10_MIN_SET_SIZE) continue;
      if (setKey(pattern.tendererIds) !== thisSet) continue;
      if (pattern.occurrences < config.RULE_10_MIN_RECURRENCE) continue;
      const winRate =
        pattern.occurrences > 0
          ? pattern.winnerWinCount / pattern.occurrences
          : 0;
      if (winRate < config.RULE_10_MIN_WIN_RATE) continue;

      return [
        makeSignal({
          rule_id: 'repeat_winner_same_competitors',
          ocid: release.ocid,
          family: 'F2',
          severity: 'high',
          confidence: confidence(
            pattern.occurrences,
            config.RULE_10_MIN_RECURRENCE,
            config.RULE_10_SCALE,
          ),
          title: 'repeat_winner_same_competitors.title',
          explanation: 'repeat_winner_same_competitors.explanation',
          story_angle:
            'The same group of bidders repeatedly competes and the same one keeps winning.',
          evidence: [
            {
              field: 'bids[].tendererId',
              value: pattern.tendererIds,
              comparison: `set recurs ${pattern.occurrences}x (>= ${config.RULE_10_MIN_RECURRENCE})`,
            },
            {
              field: 'awards[].supplierIds',
              value: pattern.winnerIds,
              comparison: `win rate ${winRate.toFixed(2)} >= ${config.RULE_10_MIN_WIN_RATE}`,
            },
          ],
          primaryEntityId: buyerId,
          secondaryEntityIds: pattern.winnerIds.map((w) =>
            ctx.entities.canonicalOf(w),
          ),
        }),
      ];
    }
    return [];
  },
});
