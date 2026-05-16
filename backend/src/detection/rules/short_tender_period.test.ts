import { describe, it, expect } from 'vitest';
import './short_tender_period.js';
import { ruleById, makeCtx } from '../__fixtures__/ctx.js';
import { makeRelease } from '../__fixtures__/release.js';

const rule = ruleById('short_tender_period');

const award = [
  {
    id: 'a',
    date: '2026-04-03T10:00:00-06:00',
    status: 'active',
    statusDetails: 'Habilitado',
    value: { amount: 120_000, currency: 'GTQ' },
    supplierIds: ['GT-NIT-7894880'],
  },
];

describe('short_tender_period (rule 20, F4)', () => {
  it('fires when period < 3d and value >= 90k', () => {
    const r = makeRelease({
      tender: {
        ...makeRelease().tender,
        tenderPeriod: {
          startDate: '2026-04-01T08:00:00-06:00',
          endDate: '2026-04-02T08:00:00-06:00',
        },
      },
      awards: award,
    });
    const out = rule.run(makeCtx({ release: r }));
    expect(out).toHaveLength(1);
    expect(out[0]!.severity).toBe('medium');
  });

  it('does NOT fire when endDate is null (gated)', () => {
    const r = makeRelease({
      tender: {
        ...makeRelease().tender,
        tenderPeriod: { startDate: '2026-04-01T08:00:00-06:00', endDate: null },
      },
      awards: award,
    });
    expect(rule.run(makeCtx({ release: r }))).toHaveLength(0);
  });

  it('does NOT fire when period >= 3d', () => {
    const r = makeRelease({
      tender: {
        ...makeRelease().tender,
        tenderPeriod: {
          startDate: '2026-04-01T08:00:00-06:00',
          endDate: '2026-04-10T08:00:00-06:00',
        },
      },
      awards: award,
    });
    expect(rule.run(makeCtx({ release: r }))).toHaveLength(0);
  });

  it('does NOT fire below 90k', () => {
    const r = makeRelease({
      tender: {
        ...makeRelease().tender,
        tenderPeriod: {
          startDate: '2026-04-01T08:00:00-06:00',
          endDate: '2026-04-02T08:00:00-06:00',
        },
      },
    });
    expect(rule.run(makeCtx({ release: r }))).toHaveLength(0);
  });
});
