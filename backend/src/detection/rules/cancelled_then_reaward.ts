import { registerRule } from '../registry.js';
import { makeSignal } from '../rule-helpers.js';

// Rule 23 (F4): cancelled_then_reaward — the same release carries both a
// cancelled award and a later active award (the re-award). Pure intra-release
// (awards[].status: cancelled 21/3350, active 3329/3350). needsHistory: true
// per idea/03 (re-award linkage), but evaluated within the compiled release.
registerRule({
  id: 'cancelled_then_reaward',
  family: 'F4',
  needsHistory: true,
  run(ctx) {
    const { release, config } = ctx;
    const cancelled = release.awards.filter((a) => a.status === 'cancelled');
    const active = release.awards.filter((a) => a.status === 'active');
    if (cancelled.length === 0 || active.length === 0) return [];

    const buyerId = ctx.entities.canonicalOf(release.buyer.id);
    const cancelledSuppliers = new Set(
      cancelled.flatMap((a) => a.supplierIds.map((s) => ctx.entities.canonicalOf(s))),
    );
    const activeSuppliers = active.flatMap((a) =>
      a.supplierIds.map((s) => ctx.entities.canonicalOf(s)),
    );
    const sameSupplierReaward = activeSuppliers.some((s) =>
      cancelledSuppliers.has(s),
    );

    return [
      makeSignal({
        rule_id: 'cancelled_then_reaward',
        ocid: release.ocid,
        family: 'F4',
        severity: 'medium',
        // No tunable metric ratio — fixed evidence presence; RULE_23_SCALE=1
        // keeps the formula well-formed (metric 1 over threshold 0).
        confidence: Math.min(1, 1 / config.RULE_23_SCALE),
        title: 'cancelled_then_reaward.title',
        explanation: 'cancelled_then_reaward.explanation',
        story_angle:
          'An award was cancelled and then re-issued within the same procurement.',
        evidence: [
          {
            field: 'awards[].status',
            value: {
              cancelled: cancelled.length,
              active: active.length,
              sameSupplierReaward,
            },
            comparison: 'cancelled award + later active award (same ocid)',
          },
          {
            field: 'awards[].supplierIds',
            value: activeSuppliers,
          },
        ],
        primaryEntityId: buyerId,
        secondaryEntityIds: activeSuppliers,
      }),
    ];
  },
});
