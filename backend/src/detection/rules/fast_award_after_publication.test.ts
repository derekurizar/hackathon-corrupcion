import { describe, it, expect } from 'vitest';
import './fast_award_after_publication.js';
import { ruleById, makeCtx } from '../__fixtures__/ctx.js';
import { makeRelease } from '../__fixtures__/release.js';

const rule = ruleById('fast_award_after_publication');

function release(publishedISO: string, awardISO: string, amount = 120_000) {
  return makeRelease({
    tender: { ...makeRelease().tender, datePublished: publishedISO },
    awards: [
      {
        id: 'a',
        date: awardISO,
        status: 'active',
        statusDetails: 'Habilitado',
        value: { amount, currency: 'GTQ' },
        supplierIds: ['GT-NIT-7894880'],
      },
    ],
  });
}

describe('fast_award_after_publication (rule 21, F4)', () => {
  it('fires when award < 2d after publication and value >= 90k', () => {
    const out = rule.run(
      makeCtx({
        release: release(
          '2026-04-01T08:00:00-06:00',
          '2026-04-02T06:00:00-06:00',
        ),
      }),
    );
    expect(out).toHaveLength(1);
    expect(out[0]!.severity).toBe('medium');
  });

  it('does NOT fire when >= 2 days elapsed', () => {
    expect(
      rule.run(
        makeCtx({
          release: release(
            '2026-04-01T08:00:00-06:00',
            '2026-04-05T08:00:00-06:00',
          ),
        }),
      ),
    ).toHaveLength(0);
  });

  it('does NOT fire below 90k', () => {
    expect(
      rule.run(
        makeCtx({
          release: release(
            '2026-04-01T08:00:00-06:00',
            '2026-04-02T06:00:00-06:00',
            10_000,
          ),
        }),
      ),
    ).toHaveLength(0);
  });
});
