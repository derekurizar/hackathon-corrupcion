import { registerRule } from '../registry.js';
import { confidence } from '../confidence.js';
import { makeSignal } from '../rule-helpers.js';

// Rule 11 (F2): new_supplier_large_first_award — an awarded supplier whose
// first award in the whole scope is this release AND that award value ≥ 900k.
// "First in scope" = rollup.awardCount === 1 AND rollup.firstAwardDate matches
// this award's date. needsHistory: true.
registerRule({
  id: 'new_supplier_large_first_award',
  family: 'F2',
  needsHistory: true,
  run(ctx) {
    const { release, config } = ctx;
    if (release.awards.length === 0) return [];
    const buyerId = ctx.entities.canonicalOf(release.buyer.id);

    const seen = new Set<string>();
    const out = [];
    for (const award of release.awards) {
      if (award.value.amount < config.RULE_11_MIN_VALUE) continue;
      for (const rawSid of award.supplierIds) {
        const sid = ctx.entities.canonicalOf(rawSid);
        if (seen.has(sid)) continue;
        seen.add(sid);
        const rollup = ctx.entities.rollup(sid);
        if (!rollup) continue;
        if (rollup.awardCount !== 1) continue;
        if (rollup.firstAwardDate !== award.date) continue;

        out.push(
          makeSignal({
            rule_id: 'new_supplier_large_first_award',
            ocid: release.ocid,
            family: 'F2',
            severity: 'medium',
            confidence: confidence(
              award.value.amount,
              config.RULE_11_MIN_VALUE,
              config.RULE_11_SCALE,
            ),
            title: 'new_supplier_large_first_award.title',
            explanation: 'new_supplier_large_first_award.explanation',
            story_angle:
              'A supplier with no prior track record lands a large contract on its first appearance.',
            evidence: [
              {
                field: 'awards[].supplierIds',
                value: sid,
                comparison: 'first (and only) award in scope',
                benchmark: { firstAwardDate: rollup.firstAwardDate },
              },
              {
                field: 'awards[].value.amount',
                value: award.value.amount,
                comparison: `>= ${config.RULE_11_MIN_VALUE}`,
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
