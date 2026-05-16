import { registerRule } from '../registry.js';
import { confidence } from '../confidence.js';
import { makeSignal } from '../rule-helpers.js';

// Rule 9 (F2): supplier_cross_categories — an awarded supplier spans ≥ 4
// distinct UNSPSC families AND has total awarded value ≥ 500k across the
// scope. Reads the supplier rollup (categoryFamilies, awardValue).
// needsHistory: true. One signal per qualifying awarded supplier.
registerRule({
  id: 'supplier_cross_categories',
  family: 'F2',
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
        const families = rollup.categoryFamilies.filter((f) => f !== '');
        if (families.length < config.RULE_9_MIN_FAMILIES) continue;
        if (rollup.awardValue < config.RULE_9_MIN_TOTAL) continue;

        out.push(
          makeSignal({
            rule_id: 'supplier_cross_categories',
            ocid: release.ocid,
            family: 'F2',
            severity: 'medium',
            confidence: confidence(
              families.length,
              config.RULE_9_MIN_FAMILIES,
              config.RULE_9_SCALE,
            ),
            title: 'supplier_cross_categories.title',
            explanation: 'supplier_cross_categories.explanation',
            story_angle:
              'One supplier wins across an unusually broad spread of unrelated procurement categories.',
            evidence: [
              {
                field: 'awards[].supplierIds',
                value: sid,
                comparison: `>= ${config.RULE_9_MIN_FAMILIES} distinct UNSPSC families`,
                benchmark: {
                  families,
                  awardValue: rollup.awardValue,
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
