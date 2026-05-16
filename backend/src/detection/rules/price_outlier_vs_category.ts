import { registerRule } from '../registry.js';
import { confidence } from '../confidence.js';
import { awardCategory, resolveCategoryLevel } from '../category.js';
import { makeSignal, firstAwardAmount } from '../rule-helpers.js';

// Rule 13 (F3): price_outlier_vs_category — award value above
// p75 + 1.5·IQR OR ≥ 3× the family median (high ≥ 5×). Family must have
// count >= CATEGORY_MIN_SAMPLE (resolveCategoryLevel handles the
// family→segment→mainCategory fallback). needsHistory: true.
registerRule({
  id: 'price_outlier_vs_category',
  family: 'F3',
  needsHistory: true,
  run(ctx) {
    const { release, benchmarks, config } = ctx;
    if (release.awards.length === 0) return [];
    const family = awardCategory(release);
    if (family === '') return [];
    const resolved = resolveCategoryLevel(
      family,
      release.tender.mainProcurementCategory,
      benchmarks.categoryPrice,
      config,
    );
    if (!resolved) return [];

    const { stats, key } = resolved;
    const amount = firstAwardAmount(release);
    const iqr = stats.p75 - stats.p25;
    const iqrCeiling = stats.p75 + config.RULE_13_IQR_MULT * iqr;
    const medianMult = stats.median > 0 ? amount / stats.median : 0;

    const isIqrOutlier = amount > iqrCeiling;
    const isMedianOutlier = medianMult >= config.RULE_13_MEDIAN_MULT;
    if (!isIqrOutlier && !isMedianOutlier) return [];

    const severity =
      medianMult >= config.RULE_13_HIGH_MEDIAN_MULT ? 'high' : 'medium';
    const buyerId = ctx.entities.canonicalOf(release.buyer.id);
    const suppliers = release.awards[0]!.supplierIds.map((s) =>
      ctx.entities.canonicalOf(s),
    );

    return [
      makeSignal({
        rule_id: 'price_outlier_vs_category',
        ocid: release.ocid,
        family: 'F3',
        severity,
        confidence: confidence(
          medianMult,
          config.RULE_13_MEDIAN_MULT,
          config.RULE_13_SCALE,
        ),
        title: 'price_outlier_vs_category.title',
        explanation: 'price_outlier_vs_category.explanation',
        story_angle:
          'This award is priced far above comparable contracts in the same category.',
        evidence: [
          {
            field: 'awards[].value.amount',
            value: amount,
            comparison:
              `${medianMult.toFixed(2)}x family median` +
              (isIqrOutlier ? ' (also > p75+1.5·IQR)' : ''),
            benchmark: {
              level: stats.level,
              key,
              median: stats.median,
              p25: stats.p25,
              p75: stats.p75,
              count: stats.count,
              iqrCeiling,
            },
          },
        ],
        primaryEntityId: buyerId,
        secondaryEntityIds: suppliers,
      }),
    ];
  },
});
