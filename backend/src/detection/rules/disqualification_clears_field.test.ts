import { describe, it, expect } from 'vitest';
import './disqualification_clears_field.js';
import { ruleById, makeCtx } from '../__fixtures__/ctx.js';
import { makeRelease } from '../__fixtures__/release.js';

const rule = ruleById('disqualification_clears_field');

const bid = (status: string, tendererId: string) => ({
  status,
  amount: 1000,
  tendererId,
});

describe('disqualification_clears_field (rule 5, F1)', () => {
  it('fires high when DQ leaves exactly 1 valid bidder who wins', () => {
    const r = makeRelease({
      bids: [
        bid('valid', 'GT-NIT-7894880'),
        bid('disqualified', 'GT-NIT-15856801'),
        bid('disqualified', 'GT-NIT-99999'),
      ],
      awards: [
        {
          id: 'a',
          date: '2026-04-02T10:00:00-06:00',
          status: 'active',
          statusDetails: 'Habilitado',
          value: { amount: 50000, currency: 'GTQ' },
          supplierIds: ['GT-NIT-7894880'],
        },
      ],
    });
    const out = rule.run(makeCtx({ release: r }));
    expect(out).toHaveLength(1);
    expect(out[0]!.severity).toBe('high');
  });

  it('does NOT fire with < 3 bids', () => {
    const r = makeRelease({
      bids: [bid('valid', 'GT-NIT-7894880'), bid('disqualified', 'GT-NIT-2')],
    });
    expect(rule.run(makeCtx({ release: r }))).toHaveLength(0);
  });

  it('does NOT fire when 2 valid bids remain', () => {
    const r = makeRelease({
      bids: [
        bid('valid', 'GT-NIT-7894880'),
        bid('valid', 'GT-NIT-2'),
        bid('disqualified', 'GT-NIT-3'),
      ],
    });
    expect(rule.run(makeCtx({ release: r }))).toHaveLength(0);
  });

  it('does NOT fire when the surviving bidder does not win', () => {
    const r = makeRelease({
      bids: [
        bid('valid', 'GT-NIT-2'),
        bid('disqualified', 'GT-NIT-3'),
        bid('disqualified', 'GT-NIT-4'),
      ],
      awards: [
        {
          id: 'a',
          date: '2026-04-02T10:00:00-06:00',
          status: 'active',
          statusDetails: 'Habilitado',
          value: { amount: 50000, currency: 'GTQ' },
          supplierIds: ['GT-NIT-7894880'],
        },
      ],
    });
    expect(rule.run(makeCtx({ release: r }))).toHaveLength(0);
  });
});
