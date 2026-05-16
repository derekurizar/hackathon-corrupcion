import { describe, it, expect } from 'vitest';
import './threshold_hugging.js';
import { ruleById, makeCtx } from '../__fixtures__/ctx.js';
import { makeRelease } from '../__fixtures__/release.js';

const rule = ruleById('threshold_hugging');

const award = (amount: number) => [
  {
    id: 'a',
    date: '2026-04-02T10:00:00-06:00',
    status: 'active',
    statusDetails: 'Habilitado',
    value: { amount, currency: 'GTQ' },
    supplierIds: ['GT-NIT-7894880'],
  },
];

describe('threshold_hugging (rule 15, F3)', () => {
  it('fires just below the Q90k Compra Directa band', () => {
    // 0.95*90000 = 85500 <= 88000 < 90000
    const out = rule.run(makeCtx({ release: makeRelease({ awards: award(88_000) }) }));
    expect(out).toHaveLength(1);
    expect(out[0]!.severity).toBe('medium');
  });

  it('fires just below the Q900k Cotización band', () => {
    const out = rule.run(
      makeCtx({ release: makeRelease({ awards: award(880_000) }) }),
    );
    expect(out).toHaveLength(1);
  });

  it('does NOT fire well below a band', () => {
    expect(
      rule.run(makeCtx({ release: makeRelease({ awards: award(50_000) }) })),
    ).toHaveLength(0);
  });

  it('does NOT fire at or above the band ceiling', () => {
    expect(
      rule.run(makeCtx({ release: makeRelease({ awards: award(90_000) }) })),
    ).toHaveLength(0);
  });
});
