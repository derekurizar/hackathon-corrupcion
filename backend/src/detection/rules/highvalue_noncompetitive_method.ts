import { registerRule } from '../registry.js';
import { confidence } from '../confidence.js';
import { isNoncompetitiveMethod } from '../method.js';
import { makeSignal, firstAwardAmount } from '../rule-helpers.js';

// Rule 4 (F1): highvalue_noncompetitive_method — award value ≥ Q900k AND the
// procurement method is in the non-competitive Art.43/44/54 set → high.
// needsHistory: true (idea/03 marks it Hist — uses corpus method context).
registerRule({
  id: 'highvalue_noncompetitive_method',
  family: 'F1',
  needsHistory: true,
  run(ctx) {
    const { release, config } = ctx;
    if (release.awards.length === 0) return [];
    const amount = firstAwardAmount(release);
    if (amount < config.RULE_4_MIN_VALUE) return [];
    if (!isNoncompetitiveMethod(release.tender.procurementMethodDetails)) {
      return [];
    }

    const buyerId = ctx.entities.canonicalOf(release.buyer.id);
    const suppliers = release.awards[0]!.supplierIds.map((s) => ctx.entities.canonicalOf(s));

    return [
      makeSignal({
        rule_id: 'highvalue_noncompetitive_method',
        ocid: release.ocid,
        family: 'F1',
        severity: 'high',
        confidence: confidence(amount, config.RULE_4_MIN_VALUE, config.RULE_4_SCALE),
        title: 'highvalue_noncompetitive_method.title',
        explanation: 'highvalue_noncompetitive_method.explanation',
        story_angle:
          'A high-value contract was awarded through a non-competitive exception procedure.',
        evidence: [
          {
            field: 'tender.procurementMethodDetails',
            value: release.tender.procurementMethodDetails,
            comparison: 'non-competitive (Art.43/44/54 set)',
          },
          {
            field: 'awards[].value.amount',
            value: amount,
            comparison: `>= ${config.RULE_4_MIN_VALUE}`,
          },
        ],
        primaryEntityId: buyerId,
        secondaryEntityIds: suppliers,
      }),
    ];
  },
});
