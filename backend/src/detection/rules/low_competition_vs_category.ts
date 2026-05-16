import { registerRule } from '../registry.js';
import { confidence } from '../confidence.js';
import { awardCategory } from '../category.js';
import { makeSignal } from '../rule-helpers.js';

// Rule 2 (F1): low_competition_vs_category — numberOfTenderers < family p25
// AND ≤ 2. Uses the new benchmark field categoryPrice[family].tendererCountP25.
// Guard: the family must have count >= CATEGORY_MIN_SAMPLE. needsHistory: true.
registerRule({
  id: 'low_competition_vs_category',
  family: 'F1',
  needsHistory: true,
  run(ctx) {
    const { release, benchmarks, config } = ctx;
    if (release.awards.length === 0) return [];

    const family = awardCategory(release);
    if (family === '') return [];
    const stats = benchmarks.categoryPrice[family];
    if (!stats || stats.count < config.CATEGORY_MIN_SAMPLE) return [];

    const tenderers = release.tender.numberOfTenderers;
    const p25 = stats.tendererCountP25;
    if (tenderers >= p25 || tenderers > config.RULE_2_MAX_TENDERERS) return [];

    const buyerId = ctx.entities.canonicalOf(release.buyer.id);
    const suppliers = release.awards[0]!.supplierIds.map((s) => ctx.entities.canonicalOf(s));

    return [
      makeSignal({
        rule_id: 'low_competition_vs_category',
        ocid: release.ocid,
        family: 'F1',
        severity: 'medium',
        confidence: confidence(p25 - tenderers, 0, config.RULE_2_SCALE),
        title: 'low_competition_vs_category.title',
        explanation: 'low_competition_vs_category.explanation',
        story_angle:
          'Bidder turnout fell well below what comparable contracts in this category usually attract.',
        evidence: [
          {
            field: 'tender.numberOfTenderers',
            value: tenderers,
            comparison: `< family p25 (${p25})`,
            benchmark: {
              family,
              tendererCountP25: p25,
              level: stats.level,
              count: stats.count,
            },
          },
        ],
        primaryEntityId: buyerId,
        secondaryEntityIds: suppliers,
      }),
    ];
  },
});
