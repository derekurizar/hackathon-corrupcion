import { describe, it, expect } from 'vitest';
import './cancelled_then_reaward.js';
import { ruleById, makeCtx } from '../__fixtures__/ctx.js';
import { makeRelease } from '../__fixtures__/release.js';

const rule = ruleById('cancelled_then_reaward');

describe('cancelled_then_reaward (rule 23, F4)', () => {
  it('fires when the release has both a cancelled and an active award', () => {
    const r = makeRelease({
      awards: [
        {
          id: 'a1',
          date: '2026-04-02T10:00:00-06:00',
          status: 'cancelled',
          statusDetails: 'Inhabilitado',
          value: { amount: 50_000, currency: 'GTQ' },
          supplierIds: ['GT-NIT-15856801'],
        },
        {
          id: 'a2',
          date: '2026-04-05T10:00:00-06:00',
          status: 'active',
          statusDetails: 'Habilitado',
          value: { amount: 55_000, currency: 'GTQ' },
          supplierIds: ['GT-NIT-7894880'],
        },
      ],
    });
    const out = rule.run(makeCtx({ release: r }));
    expect(out).toHaveLength(1);
    expect(out[0]!.severity).toBe('medium');
  });

  it('does NOT fire with only active awards', () => {
    expect(rule.run(makeCtx({ release: makeRelease() }))).toHaveLength(0);
  });

  it('does NOT fire with only a cancelled award', () => {
    const r = makeRelease({
      awards: [
        {
          id: 'a1',
          date: '2026-04-02T10:00:00-06:00',
          status: 'cancelled',
          statusDetails: 'Inhabilitado',
          value: { amount: 50_000, currency: 'GTQ' },
          supplierIds: ['GT-NIT-15856801'],
        },
      ],
    });
    expect(rule.run(makeCtx({ release: r }))).toHaveLength(0);
  });
});
