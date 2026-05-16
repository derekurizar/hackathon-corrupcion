import { describe, it, expect } from 'vitest';
import './low_discount_winner.js';
import { ruleById, makeCtx } from '../__fixtures__/ctx.js';
import { makeRelease } from '../__fixtures__/release.js';

const rule = ruleById('low_discount_winner');

const winnerAward = [
  {
    id: 'a',
    date: '2026-04-02T10:00:00-06:00',
    status: 'active',
    statusDetails: 'Habilitado',
    value: { amount: 99_000, currency: 'GTQ' },
    supplierIds: ['GT-NIT-7894880'],
  },
];

describe('low_discount_winner (rule 17, F3)', () => {
  it('fires when winner is not the lowest and spread > 10%', () => {
    const r = makeRelease({
      bids: [
        { status: 'valid', amount: 80_000, tendererId: 'GT-NIT-LOW' },
        { status: 'valid', amount: 99_000, tendererId: 'GT-NIT-7894880' },
        { status: 'valid', amount: 120_000, tendererId: 'GT-NIT-HI' },
      ],
      awards: winnerAward,
    });
    const out = rule.run(makeCtx({ release: r }));
    expect(out).toHaveLength(1);
    expect(out[0]!.severity).toBe('medium');
  });

  it('does NOT fire with < 3 valid bids', () => {
    const r = makeRelease({
      bids: [
        { status: 'valid', amount: 80_000, tendererId: 'GT-NIT-LOW' },
        { status: 'valid', amount: 99_000, tendererId: 'GT-NIT-7894880' },
      ],
      awards: winnerAward,
    });
    expect(rule.run(makeCtx({ release: r }))).toHaveLength(0);
  });

  it('does NOT fire when spread is tight (<= 10%)', () => {
    const r = makeRelease({
      bids: [
        { status: 'valid', amount: 98_000, tendererId: 'GT-NIT-LOW' },
        { status: 'valid', amount: 99_000, tendererId: 'GT-NIT-7894880' },
        { status: 'valid', amount: 100_000, tendererId: 'GT-NIT-HI' },
      ],
      awards: winnerAward,
    });
    expect(rule.run(makeCtx({ release: r }))).toHaveLength(0);
  });
});
