import { describe, it, expect } from 'vitest';
import './weak_documentation.js';
import { ruleById, makeCtx } from '../__fixtures__/ctx.js';
import { makeRelease } from '../__fixtures__/release.js';

const rule = ruleById('weak_documentation');

const bigAward = [
  {
    id: 'a',
    date: '2026-04-02T10:00:00-06:00',
    status: 'active',
    statusDetails: 'Habilitado',
    value: { amount: 1_000_000, currency: 'GTQ' },
    supplierIds: ['GT-NIT-7894880'],
  },
];

describe('weak_documentation (rule 22, F4)', () => {
  it('fires when doc count <= 1 and value >= 900k', () => {
    const r = makeRelease({
      tender: {
        ...makeRelease().tender,
        documentsSummary: {
          count: 1,
          types: ['purchaseRequest'],
          firstDatePublished: '2026-04-01T08:00:00-06:00',
        },
      },
      awards: bigAward,
    });
    const out = rule.run(makeCtx({ release: r }));
    expect(out).toHaveLength(1);
    expect(out[0]!.severity).toBe('medium');
  });

  it('does NOT fire when the no-documents sentinel is set (firstDatePublished === "")', () => {
    const r = makeRelease({
      tender: {
        ...makeRelease().tender,
        documentsSummary: { count: 0, types: [], firstDatePublished: '' },
      },
      awards: bigAward,
    });
    expect(rule.run(makeCtx({ release: r }))).toHaveLength(0);
  });

  it('does NOT fire when doc count > 1', () => {
    const r = makeRelease({ awards: bigAward });
    expect(rule.run(makeCtx({ release: r }))).toHaveLength(0);
  });

  it('does NOT fire below 900k', () => {
    const r = makeRelease({
      tender: {
        ...makeRelease().tender,
        documentsSummary: {
          count: 1,
          types: ['purchaseRequest'],
          firstDatePublished: '2026-04-01T08:00:00-06:00',
        },
      },
    });
    expect(rule.run(makeCtx({ release: r }))).toHaveLength(0);
  });
});
