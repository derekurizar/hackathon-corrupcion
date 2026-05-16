import { registerRule } from '../registry.js';
import { confidence } from '../confidence.js';
import { makeSignal } from '../rule-helpers.js';

// Rule 18 (F4, HIGH): contract_splitting — same buyer + supplier + UNSPSC
// family, ≥ 3 awards within a 30-day window, each < Q90k, summing ≥ Q90k.
// Clusters are precomputed in benchmarks.splittingClusters; this release
// fires once per cluster it belongs to. needsHistory: true.
registerRule({
  id: 'contract_splitting',
  family: 'F4',
  needsHistory: true,
  run(ctx) {
    const { release, benchmarks, config } = ctx;
    const buyerId = ctx.entities.canonicalOf(release.buyer.id);

    const out = [];
    for (const cluster of benchmarks.splittingClusters) {
      if (!cluster.ocids.includes(release.ocid)) continue;
      if (cluster.ocids.length < config.RULE_18_MIN_AWARDS) continue;
      if (cluster.amounts.some((a) => a >= config.RULE_18_PER_AWARD_MAX)) {
        continue;
      }
      if (cluster.clusterSum < config.LCE_COMPRA_DIRECTA_MAX) continue;

      out.push(
        makeSignal({
          rule_id: 'contract_splitting',
          ocid: release.ocid,
          family: 'F4',
          severity: 'high',
          confidence: confidence(
            cluster.ocids.length,
            config.RULE_18_MIN_AWARDS,
            config.RULE_18_SCALE,
          ),
          title: 'contract_splitting.title',
          explanation: 'contract_splitting.explanation',
          story_angle:
            'A single larger purchase appears split into several sub-threshold awards to the same supplier.',
          evidence: [
            {
              field: 'awards[].value.amount',
              value: cluster.amounts,
              comparison: `${cluster.ocids.length} awards within ${config.RULE_18_WINDOW_DAYS}d, each < ${config.RULE_18_PER_AWARD_MAX}, sum ${cluster.clusterSum}`,
              benchmark: {
                clusterSum: cluster.clusterSum,
                ocids: cluster.ocids,
                dates: cluster.dates,
                family: cluster.family,
              },
            },
            {
              field: 'awards[].supplierIds',
              value: cluster.canonicalSupplierId,
            },
          ],
          primaryEntityId: buyerId,
          secondaryEntityIds: [cluster.canonicalSupplierId],
        }),
      );
    }
    return out;
  },
});
