import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../db/collections.js', () => ({
  getCollection: vi.fn(),
}));

import { getCollection } from '../db/collections.js';
import {
  pruneSplittingClusters,
  pruneFailedThenAwardIndex,
  pruneRepeatWinnerIndex,
  getBenchmarkByScope,
} from './benchmarks.js';
import type { Benchmark } from '../schema/index.js';

type Cluster = Benchmark['splittingClusters'][number];
const cluster = (clusterSum: number, buyerId = 'B'): Cluster => ({
  buyerId,
  canonicalSupplierId: 'S',
  family: '8110',
  ocids: ['o1'],
  dates: ['2026-01-01'],
  amounts: [clusterSum],
  clusterSum,
});

describe('pruneSplittingClusters (Rule 18 — keep top 10k by clusterSum)', () => {
  it('passes through untouched when at or below the cap', () => {
    const input = [cluster(3), cluster(1), cluster(2)];
    expect(pruneSplittingClusters(input)).toEqual(input);
  });

  it('keeps exactly the 10k strongest (largest clusterSum) when over the cap', () => {
    // 10_001 clusters with clusterSum = index → the single weakest (sum 0)
    // must be dropped, the 10k strongest kept.
    const input = Array.from({ length: 10_001 }, (_, i) => cluster(i));
    const out = pruneSplittingClusters(input);
    expect(out).toHaveLength(10_000);
    const sums = out.map((c) => c.clusterSum);
    expect(Math.min(...sums)).toBe(1); // sum 0 dropped
    expect(Math.max(...sums)).toBe(10_000);
  });

  it('does not mutate the input array', () => {
    const input = Array.from({ length: 10_002 }, (_, i) => cluster(i));
    const copy = [...input];
    pruneSplittingClusters(input);
    expect(input).toEqual(copy);
  });
});

type FailedEntry = Benchmark['failedThenAwardIndex'][string][number];
const failed = (date: string): FailedEntry => ({
  priorOcid: `o-${date}`,
  statusDetails: 'Desierto',
  date,
});

describe('pruneFailedThenAwardIndex (Rule 6)', () => {
  it('slices each key to the 20 most recent by date descending', () => {
    const entries = Array.from({ length: 25 }, (_, i) =>
      failed(`2026-01-${String(i + 1).padStart(2, '0')}`),
    );
    const out = pruneFailedThenAwardIndex({ 'B|8110': entries });
    expect(out['B|8110']).toHaveLength(20);
    // Newest first, oldest 5 dropped (days 01..05).
    expect(out['B|8110']![0]!.date).toBe('2026-01-25');
    expect(out['B|8110']![19]!.date).toBe('2026-01-06');
  });

  it('keeps all keys (incl. singletons) when total entries <= 50k', () => {
    const index: Benchmark['failedThenAwardIndex'] = {
      a: [failed('2026-01-01')],
      b: [failed('2026-01-01'), failed('2026-01-02')],
    };
    const out = pruneFailedThenAwardIndex(index);
    expect(Object.keys(out).sort()).toEqual(['a', 'b']);
    expect(out['a']).toHaveLength(1);
  });

  it('drops singleton keys once total entries exceeds 50k', () => {
    const index: Benchmark['failedThenAwardIndex'] = {};
    // 2600 keys × 20 entries = 52_000 > 50_000 threshold.
    for (let k = 0; k < 2600; k++) {
      index[`multi-${k}`] = Array.from({ length: 30 }, (_, i) =>
        failed(`2026-01-${String((i % 28) + 1).padStart(2, '0')}`),
      );
    }
    index['solo'] = [failed('2026-01-01')];
    const out = pruneFailedThenAwardIndex(index);
    expect(out['solo']).toBeUndefined(); // singleton dropped
    expect(out['multi-0']).toHaveLength(20); // multi keys sliced + kept
  });
});

type RepeatIndex = Benchmark['repeatWinnerIndex'];
describe('pruneRepeatWinnerIndex (Rule 10 — drop sets with no dominant winner)', () => {
  it('drops tenderer sets with win-rate < 0.7 and removes emptied buyers', () => {
    const index: RepeatIndex = {
      dominant: {
        tendererSets: [
          { tendererIds: ['t1'], winnerIds: ['t1'], occurrences: 10, winnerWinCount: 8 }, // 0.8 keep
        ],
      },
      weak: {
        tendererSets: [
          { tendererIds: ['t2'], winnerIds: ['t2'], occurrences: 10, winnerWinCount: 5 }, // 0.5 drop
        ],
      },
    };
    const out = pruneRepeatWinnerIndex(index);
    expect(Object.keys(out)).toEqual(['dominant']);
    expect(out['dominant']!.tendererSets).toHaveLength(1);
  });

  it('keeps a set exactly at the 0.7 boundary', () => {
    const index: RepeatIndex = {
      edge: {
        tendererSets: [
          { tendererIds: ['t'], winnerIds: ['t'], occurrences: 10, winnerWinCount: 7 }, // 0.7
        ],
      },
    };
    expect(pruneRepeatWinnerIndex(index)['edge']!.tendererSets).toHaveLength(1);
  });

  it('treats zero occurrences as rate 0 (dropped)', () => {
    const index: RepeatIndex = {
      zero: {
        tendererSets: [
          { tendererIds: ['t'], winnerIds: [], occurrences: 0, winnerWinCount: 0 },
        ],
      },
    };
    expect(pruneRepeatWinnerIndex(index)).toEqual({});
  });
});

// The 5 large fields that `upsertBenchmark` writes as separate part docs,
// keyed `${scope}#${field}` (mirrors PART_FIELDS / SHARD_KEYS internally).
const PART_FIELDS = [
  'buyerMethodMix',
  'buyerWeeklyBaseline',
  'splittingClusters',
  'failedThenAwardIndex',
  'repeatWinnerIndex',
] as const;

const SCOPE = 'scope:2026-01..2026-12';

/** Small-fields HEAD doc (sharded format — carries `shardKeys`). */
const headDoc = (): Record<string, unknown> => ({
  _id: SCOPE,
  shardKeys: PART_FIELDS.map((f) => `#${f}`),
  periodScope: { minMonth: '2026-01', maxMonth: '2026-12' },
  categoryPrice: { '8110': { median: 1, p25: 1, p75: 1, count: 1, level: 'L', tendererCountP25: 1 } },
  peerCategoryMedian: { '8110': 1 },
  nationalMethodBaseline: { open: 0.5 },
  cohortStats: { individual: { p90: 100, count: 3 } },
});

/** The 5 part docs (`_id = ${SCOPE}#${field}`), each holding one large field. */
const partDocs = (): Array<Record<string, unknown> & { _id: string }> => [
  { _id: `${SCOPE}#buyerMethodMix`, buyerMethodMix: { B: { open: { valueShare: 1, countShare: 1 } } } },
  { _id: `${SCOPE}#buyerWeeklyBaseline`, buyerWeeklyBaseline: { B: { medianWeeklyAwardCount: 2, p75WeeklyAwardCount: 4 } } },
  {
    _id: `${SCOPE}#splittingClusters`,
    splittingClusters: [
      {
        buyerId: 'B',
        canonicalSupplierId: 'S',
        family: '8110',
        ocids: ['o1'],
        dates: ['2026-01-01'],
        amounts: [10],
        clusterSum: 10,
      },
    ],
  },
  {
    _id: `${SCOPE}#failedThenAwardIndex`,
    failedThenAwardIndex: { 'B|8110': [{ priorOcid: 'o0', statusDetails: 'Desierto', date: '2026-01-01' }] },
  },
  {
    _id: `${SCOPE}#repeatWinnerIndex`,
    repeatWinnerIndex: { B: { tendererSets: [{ tendererIds: ['t'], winnerIds: ['t'], occurrences: 10, winnerWinCount: 8 }] } },
  },
];

describe('getBenchmarkByScope', () => {
  let mockFindOne: ReturnType<typeof vi.fn>;
  let mockToArray: ReturnType<typeof vi.fn>;
  let mockFind: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFindOne = vi.fn();
    mockToArray = vi.fn();
    mockFind = vi.fn(() => ({ toArray: mockToArray }));
    (getCollection as ReturnType<typeof vi.fn>).mockResolvedValue({
      findOne: mockFindOne,
      find: mockFind,
    });
  });

  it('(a) returns null when findOne returns null (no doc found)', async () => {
    mockFindOne.mockResolvedValue(null);
    expect(await getBenchmarkByScope(SCOPE)).toBeNull();
    expect(mockFind).not.toHaveBeenCalled();
  });

  it('(b) legacy fast-path: a doc with no shardKeys array is returned as-is', async () => {
    const legacy = {
      ...headDoc(),
      shardKeys: undefined,
      buyerMethodMix: { B: { open: { valueShare: 1, countShare: 1 } } },
      buyerWeeklyBaseline: {},
      splittingClusters: [],
      failedThenAwardIndex: {},
      repeatWinnerIndex: {},
    };
    delete (legacy as { shardKeys?: unknown }).shardKeys;
    mockFindOne.mockResolvedValue(legacy);

    const result = await getBenchmarkByScope(SCOPE);
    expect(result).toBe(legacy as unknown as Benchmark);
    // Fast path must NOT query for parts.
    expect(mockFind).not.toHaveBeenCalled();
  });

  it('(c) sharded merge: all 5 parts present → fully merged Benchmark', async () => {
    mockFindOne.mockResolvedValue(headDoc());
    mockToArray.mockResolvedValue(partDocs());

    const result = await getBenchmarkByScope(SCOPE);
    expect(result).not.toBeNull();
    const b = result as Benchmark;
    expect(b._id).toBe(SCOPE);
    expect(b.periodScope).toEqual({ minMonth: '2026-01', maxMonth: '2026-12' });
    // Each of the 5 large fields merged from its part doc (not the default).
    expect(b.buyerMethodMix).toEqual({ B: { open: { valueShare: 1, countShare: 1 } } });
    expect(b.buyerWeeklyBaseline).toEqual({ B: { medianWeeklyAwardCount: 2, p75WeeklyAwardCount: 4 } });
    expect(b.splittingClusters).toHaveLength(1);
    expect(b.splittingClusters[0]!.clusterSum).toBe(10);
    expect(b.failedThenAwardIndex['B|8110']).toHaveLength(1);
    expect(b.repeatWinnerIndex['B']!.tendererSets).toHaveLength(1);
  });

  it('(d) returns null when fewer parts than shardKeys expects (partial shard)', async () => {
    mockFindOne.mockResolvedValue(headDoc());
    // Only 4 of the 5 expected parts (one write failed) → must NOT silently
    // merge empty defaults; must return null so the caller fails loud.
    mockToArray.mockResolvedValue(partDocs().slice(0, 4));

    expect(await getBenchmarkByScope(SCOPE)).toBeNull();
  });
});
