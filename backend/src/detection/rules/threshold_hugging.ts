import { registerRule } from '../registry.js';
import { confidence } from '../confidence.js';
import { makeSignal } from '../rule-helpers.js';

// Rule 15 (F3): threshold_hugging — an award value sitting just below an LCE
// legal ceiling: value ∈ [0.95·band, band) for Q90k (Compra Directa) or
// Q900k (Cotización). needsHistory: false.
registerRule({
  id: 'threshold_hugging',
  family: 'F3',
  needsHistory: false,
  run(ctx) {
    const { release, config } = ctx;
    if (release.awards.length === 0) return [];
    const bands = [config.LCE_COMPRA_DIRECTA_MAX, config.LCE_COTIZACION_MAX];
    const buyerId = ctx.entities.canonicalOf(release.buyer.id);

    const out = [];
    for (let i = 0; i < release.awards.length; i++) {
      const award = release.awards[i]!;
      const amount = award.value.amount;
      for (const band of bands) {
        const floor = config.RULE_15_BAND_FLOOR_FRACTION * band;
        if (amount >= floor && amount < band) {
          const proximity = amount / band; // ∈ [0.95, 1)
          out.push(
            makeSignal({
              rule_id: 'threshold_hugging',
              ocid: release.ocid,
              family: 'F3',
              severity: 'medium',
              confidence: confidence(
                proximity,
                config.RULE_15_BAND_FLOOR_FRACTION,
                config.RULE_15_SCALE,
              ),
              title: 'threshold_hugging.title',
              explanation: 'threshold_hugging.explanation',
              story_angle:
                'The award sits just under a legal threshold, avoiding a more competitive procedure.',
              evidence: [
                {
                  field: 'awards[].value.amount',
                  value: amount,
                  comparison: `within ${(1 - config.RULE_15_BAND_FLOOR_FRACTION) * 100}% below LCE band`,
                  benchmark: { band, floor },
                },
              ],
              primaryEntityId: buyerId,
              secondaryEntityIds: award.supplierIds.map((s) =>
                ctx.entities.canonicalOf(s),
              ),
            }),
          );
          break; // one signal per award (closest band wins by iteration order)
        }
      }
    }
    return out;
  },
});
