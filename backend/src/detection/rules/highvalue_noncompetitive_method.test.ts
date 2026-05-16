import { describe, it, expect } from 'vitest';
import './highvalue_noncompetitive_method.js';
import { ruleById, makeCtx } from '../__fixtures__/ctx.js';
import { makeRelease } from '../__fixtures__/release.js';

const rule = ruleById('highvalue_noncompetitive_method');

const bigAward = [
  {
    id: 'a',
    date: '2026-04-02T10:00:00-06:00',
    status: 'active',
    statusDetails: 'Habilitado',
    value: { amount: 1_500_000, currency: 'GTQ' },
    supplierIds: ['GT-NIT-7894880'],
  },
];

describe('highvalue_noncompetitive_method (rule 4, F1)', () => {
  it('fires high for >= 900k via a non-competitive method', () => {
    const r = makeRelease({ awards: bigAward });
    const out = rule.run(makeCtx({ release: r }));
    expect(out).toHaveLength(1);
    expect(out[0]!.severity).toBe('high');
  });

  it('does NOT fire for a competitive method (Licitación)', () => {
    const r = makeRelease({
      tender: {
        ...makeRelease().tender,
        procurementMethodDetails: 'Licitación Pública (Art. 17 LCE)',
      },
      awards: bigAward,
    });
    expect(rule.run(makeCtx({ release: r }))).toHaveLength(0);
  });

  it('does NOT fire below 900k', () => {
    const r = makeRelease();
    expect(rule.run(makeCtx({ release: r }))).toHaveLength(0);
  });
});
