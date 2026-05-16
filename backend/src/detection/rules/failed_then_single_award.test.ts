import { describe, it, expect } from 'vitest';
import './failed_then_single_award.js';
import { ruleById, makeCtx } from '../__fixtures__/ctx.js';
import { makeRelease, makeBenchmark } from '../__fixtures__/release.js';

const rule = ruleById('failed_then_single_award');
const KEY = 'GT-NIT:4132726|8110';

const benchWithPrior = makeBenchmark({
  failedThenAwardIndex: {
    [KEY]: [
      {
        priorOcid: 'ocds-prior-1',
        statusDetails: 'Desierto',
        date: '2026-03-15T00:00:00-06:00',
      },
    ],
  },
});

describe('failed_then_single_award (rule 6, F1)', () => {
  it('fires low with capped confidence when a prior failed tender exists', () => {
    const r = makeRelease({
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
    const out = rule.run(makeCtx({ release: r, benchmarks: benchWithPrior }));
    expect(out).toHaveLength(1);
    expect(out[0]!.severity).toBe('low');
    expect(out[0]!.confidence).toBeLessThanOrEqual(0.3);
  });

  it('does NOT fire without a prior failed tender in the index', () => {
    const r = makeRelease();
    expect(rule.run(makeCtx({ release: r }))).toHaveLength(0);
  });

  it('does NOT fire when the prior is outside the window', () => {
    const r = makeRelease({
      awards: [
        {
          id: 'a',
          date: '2026-09-02T10:00:00-06:00',
          status: 'active',
          statusDetails: 'Habilitado',
          value: { amount: 50000, currency: 'GTQ' },
          supplierIds: ['GT-NIT-7894880'],
        },
      ],
    });
    expect(rule.run(makeCtx({ release: r, benchmarks: benchWithPrior }))).toHaveLength(0);
  });

  it('does NOT fire when the award has multiple suppliers', () => {
    const r = makeRelease({
      awards: [
        {
          id: 'a',
          date: '2026-04-02T10:00:00-06:00',
          status: 'active',
          statusDetails: 'Habilitado',
          value: { amount: 50000, currency: 'GTQ' },
          supplierIds: ['GT-NIT-7894880', 'GT-NIT-15856801'],
        },
      ],
    });
    expect(rule.run(makeCtx({ release: r, benchmarks: benchWithPrior }))).toHaveLength(0);
  });
});
