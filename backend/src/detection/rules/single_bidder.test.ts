import { describe, it, expect } from 'vitest';
import './single_bidder.js';
import { RULES } from '../registry.js';
import { defaultRuleConfig } from '../config.js';
import { makeRelease, makeBenchmark, makeEntityIndex } from '../__fixtures__/release.js';
import type { RuleContext } from '../types.js';

const rule = RULES.find((r) => r.id === 'single_bidder')!;
const ctx = (release: ReturnType<typeof makeRelease>): RuleContext => ({
  release,
  benchmarks: makeBenchmark(),
  entities: makeEntityIndex({}),
  config: defaultRuleConfig,
});

describe('single_bidder (rule 1, F1)', () => {
  it('fires medium when 1 bidder and value >= 90k', () => {
    const r = makeRelease({
      tender: { ...makeRelease().tender, numberOfTenderers: 1 },
      awards: [
        {
          id: 'a',
          date: '2026-04-02T10:00:00-06:00',
          status: 'active',
          statusDetails: 'Habilitado',
          value: { amount: 120000, currency: 'GTQ' },
          supplierIds: ['GT-NIT-7894880'],
        },
      ],
    });
    const out = rule.run(ctx(r));
    expect(out).toHaveLength(1);
    expect(out[0]!.severity).toBe('medium');
    expect(out[0]!.family).toBe('F1');
    expect(out[0]!.primaryEntityId).toBe('GT-NIT:4132726');
    expect(out[0]!.evidence.map((e) => e.field)).toContain('tender.numberOfTenderers');
  });

  it('fires high when value >= 900k', () => {
    const r = makeRelease({
      tender: { ...makeRelease().tender, numberOfTenderers: 0 },
      awards: [
        {
          id: 'a',
          date: '2026-04-02T10:00:00-06:00',
          status: 'active',
          statusDetails: 'Habilitado',
          value: { amount: 1_000_000, currency: 'GTQ' },
          supplierIds: ['GT-NIT-7894880'],
        },
      ],
    });
    expect(rule.run(ctx(r))[0]!.severity).toBe('high');
  });

  it('does NOT fire with 2 bidders', () => {
    const r = makeRelease({
      tender: { ...makeRelease().tender, numberOfTenderers: 2 },
    });
    expect(rule.run(ctx(r))).toHaveLength(0);
  });

  it('does NOT fire below the medium value floor', () => {
    const r = makeRelease({
      tender: { ...makeRelease().tender, numberOfTenderers: 1 },
      awards: [
        {
          id: 'a',
          date: '2026-04-02T10:00:00-06:00',
          status: 'active',
          statusDetails: 'Habilitado',
          value: { amount: 10000, currency: 'GTQ' },
          supplierIds: ['GT-NIT-7894880'],
        },
      ],
    });
    expect(rule.run(ctx(r))).toHaveLength(0);
  });
});
