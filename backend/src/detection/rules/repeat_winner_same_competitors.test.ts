import { describe, it, expect } from 'vitest';
import './repeat_winner_same_competitors.js';
import { ruleById, makeCtx } from '../__fixtures__/ctx.js';
import { makeRelease, makeBenchmark } from '../__fixtures__/release.js';

const rule = ruleById('repeat_winner_same_competitors');
const BUYER = 'GT-NIT:4132726';

const bench = makeBenchmark({
  repeatWinnerIndex: {
    [BUYER]: {
      tendererSets: [
        {
          tendererIds: ['GT-NIT-1', 'GT-NIT-7894880'],
          winnerIds: ['GT-NIT-7894880'],
          occurrences: 5,
          winnerWinCount: 5,
        },
      ],
    },
  },
});

const bidsForSet = [
  { status: 'valid', amount: 1, tendererId: 'GT-NIT-1' },
  { status: 'valid', amount: 2, tendererId: 'GT-NIT-7894880' },
];

describe('repeat_winner_same_competitors (rule 10, F2)', () => {
  it('fires high when this release matches a recurring high-win-rate set', () => {
    const r = makeRelease({ bids: bidsForSet });
    const out = rule.run(makeCtx({ release: r, benchmarks: bench }));
    expect(out).toHaveLength(1);
    expect(out[0]!.severity).toBe('high');
  });

  it('does NOT fire when the bidder set differs', () => {
    const r = makeRelease({
      bids: [{ status: 'valid', amount: 1, tendererId: 'GT-NIT-OTHER' }],
    });
    expect(rule.run(makeCtx({ release: r, benchmarks: bench }))).toHaveLength(0);
  });

  it('does NOT fire when recurrence below threshold', () => {
    const lo = makeBenchmark({
      repeatWinnerIndex: {
        [BUYER]: {
          tendererSets: [
            {
              tendererIds: ['GT-NIT-1', 'GT-NIT-7894880'],
              winnerIds: ['GT-NIT-7894880'],
              occurrences: 2,
              winnerWinCount: 2,
            },
          ],
        },
      },
    });
    const r = makeRelease({ bids: bidsForSet });
    expect(rule.run(makeCtx({ release: r, benchmarks: lo }))).toHaveLength(0);
  });

  it('does NOT fire when win rate below 70%', () => {
    const lo = makeBenchmark({
      repeatWinnerIndex: {
        [BUYER]: {
          tendererSets: [
            {
              tendererIds: ['GT-NIT-1', 'GT-NIT-7894880'],
              winnerIds: ['GT-NIT-7894880'],
              occurrences: 5,
              winnerWinCount: 2,
            },
          ],
        },
      },
    });
    const r = makeRelease({ bids: bidsForSet });
    expect(rule.run(makeCtx({ release: r, benchmarks: lo }))).toHaveLength(0);
  });
});
