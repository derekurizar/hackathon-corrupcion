import { registerRule } from '../registry.js';
import { confidence } from '../confidence.js';
import { makeSignal } from '../rule-helpers.js';

// Rule 12 (F2): individual_large_contract — an awarded supplier classified as
// an individual (or 'unknown', treated privacy-safe as individual) whose
// award value ≥ the individual-cohort p90 AND ≥ Q90k (LCE Compra Directa
// ceiling). needsHistory: true (cohort p90 spans the scope).
registerRule({
  id: 'individual_large_contract',
  family: 'F2',
  needsHistory: true,
  run(ctx) {
    const { release, benchmarks, config } = ctx;
    if (release.awards.length === 0) return [];
    const p90 = benchmarks.cohortStats.individual.p90;
    if (p90 <= 0) return [];
    const buyerId = ctx.entities.canonicalOf(release.buyer.id);

    const seen = new Set<string>();
    const out = [];
    for (const award of release.awards) {
      const amount = award.value.amount;
      if (amount < config.RULE_12_MIN_VALUE || amount < p90) continue;
      for (const rawSid of award.supplierIds) {
        const sid = ctx.entities.canonicalOf(rawSid);
        if (seen.has(sid)) continue;
        seen.add(sid);
        const type = ctx.entities.entityType(sid);
        // 'unknown' is treated as individual (privacy-safe, per identity.ts).
        if (type === 'company') continue;

        out.push(
          makeSignal({
            rule_id: 'individual_large_contract',
            ocid: release.ocid,
            family: 'F2',
            severity: 'medium',
            confidence: confidence(amount, p90, config.RULE_12_SCALE),
            title: 'individual_large_contract.title',
            explanation: 'individual_large_contract.explanation',
            story_angle:
              'An individual (not a registered company) holds a contract far above what individuals typically receive.',
            evidence: [
              {
                field: 'entities.entityType',
                value: type,
                comparison: 'individual (or unknown → individual)',
              },
              {
                field: 'awards[].value.amount',
                value: amount,
                comparison: `>= individual cohort p90 (${p90}) and >= ${config.RULE_12_MIN_VALUE}`,
                benchmark: {
                  cohortP90: p90,
                  cohortCount: benchmarks.cohortStats.individual.count,
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
