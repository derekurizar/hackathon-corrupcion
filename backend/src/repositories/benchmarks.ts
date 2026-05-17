import { getCollection } from '../db/collections.js';
import { moduleLogger } from '../obs/logger.js';
import type { Benchmark } from '../schema/index.js';

const log = moduleLogger('repo:benchmarks');

/**
 * Repository-layer sharding for the `benchmarks` collection.
 *
 * A single `Benchmark` document at 12 months / 375k releases overflows the
 * 16 MB BSON limit. We split it — transparently to every caller — into:
 *
 *   - 1 HEAD doc:  `_id = scope`, holds the small fields + `shardKeys: string[]`
 *   - 5 PART docs: `_id = ${scope}${field-key}` (e.g. `scope:…#splittingClusters`),
 *                  each holding exactly one of the 5 large fields.
 *
 * All 6 docs live in the SAME `benchmarks` collection. `upsertBenchmark`
 * accepts / `getBenchmarkByScope` returns the public, unsharded `Benchmark`
 * type so `build-benchmarks.ts`, `run-detection.ts`, and all detection
 * callers are unchanged.
 *
 * Pruning (applied INSIDE `upsertBenchmark`, before writing) caps the three
 * highest-cardinality fields so the part-docs themselves cannot overflow.
 */

/** The 5 large fields that become their own part documents. */
const PART_FIELDS = [
  'buyerMethodMix',
  'buyerWeeklyBaseline',
  'splittingClusters',
  'failedThenAwardIndex',
  'repeatWinnerIndex',
] as const;

type PartField = (typeof PART_FIELDS)[number];

/** Part-doc id suffixes, e.g. `#splittingClusters`. */
const SHARD_KEYS = PART_FIELDS.map((f) => `#${f}`);

interface HeadDoc {
  _id: string;
  shardKeys: string[];
  periodScope: Benchmark['periodScope'];
  categoryPrice: Benchmark['categoryPrice'];
  peerCategoryMedian: Benchmark['peerCategoryMedian'];
  nationalMethodBaseline: Benchmark['nationalMethodBaseline'];
  cohortStats: Benchmark['cohortStats'];
}

// --- Pruning caps (Phase 1, untuned; documented thresholds) -----------------

/** Rule 18: keep the 10k strongest (largest `clusterSum`) splitting clusters. */
const SPLITTING_CLUSTERS_KEEP = 10_000;
/** Rule 6: per key keep the 20 most recent prior-failed entries. */
const FAILED_PER_KEY_KEEP = 20;
/** Rule 6: if total entries still exceed this, drop singleton keys. */
const FAILED_TOTAL_THRESHOLD = 50_000;
/** Rule 10: a tenderer set with win-rate below this has no dominant winner. */
const REPEAT_WINNER_MIN_RATE = 0.7;

/**
 * Rule 18 — sort by `clusterSum` descending, keep the top 10k. Only the
 * weakest signals are dropped (acceptable at untuned Phase 1).
 *
 * Exported for unit tests (same convention as `shouldReplace` /
 * `collapseByOcidKeepLatest` in `curated-releases.ts`).
 */
export function pruneSplittingClusters(
  clusters: Benchmark['splittingClusters'],
): Benchmark['splittingClusters'] {
  if (clusters.length <= SPLITTING_CLUSTERS_KEEP) return clusters;
  const pruned = [...clusters]
    .sort((a, b) => b.clusterSum - a.clusterSum)
    .slice(0, SPLITTING_CLUSTERS_KEEP);
  log(
    `prune splittingClusters before=${clusters.length} after=${pruned.length} keep=${SPLITTING_CLUSTERS_KEEP}`,
  );
  return pruned;
}

/**
 * Rule 6 — per key sort entries by `date` descending and slice to 20. If the
 * total entry count still exceeds 50k, drop keys whose array has length 1.
 */
export function pruneFailedThenAwardIndex(
  index: Benchmark['failedThenAwardIndex'],
): Benchmark['failedThenAwardIndex'] {
  const out: Benchmark['failedThenAwardIndex'] = {};
  let total = 0;
  for (const [key, entries] of Object.entries(index)) {
    const sliced = [...entries]
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
      .slice(0, FAILED_PER_KEY_KEEP);
    out[key] = sliced;
    total += sliced.length;
  }
  if (total <= FAILED_TOTAL_THRESHOLD) return out;

  const compact: Benchmark['failedThenAwardIndex'] = {};
  let kept = 0;
  for (const [key, entries] of Object.entries(out)) {
    if (entries.length === 1) continue;
    compact[key] = entries;
    kept += entries.length;
  }
  log(
    `prune failedThenAwardIndex total=${total} threshold=${FAILED_TOTAL_THRESHOLD} droppedSingletons keptEntries=${kept}`,
  );
  return compact;
}

/**
 * Rule 10 — per buyer drop tenderer sets where
 * `winnerWinCount / occurrences < 0.7` (no dominant winner; the rule would
 * never fire). Buyers left with zero sets are removed entirely.
 */
export function pruneRepeatWinnerIndex(
  index: Benchmark['repeatWinnerIndex'],
): Benchmark['repeatWinnerIndex'] {
  const out: Benchmark['repeatWinnerIndex'] = {};
  let droppedSets = 0;
  for (const [buyerId, { tendererSets }] of Object.entries(index)) {
    const kept = tendererSets.filter((s) => {
      const rate = s.occurrences > 0 ? s.winnerWinCount / s.occurrences : 0;
      if (rate < REPEAT_WINNER_MIN_RATE) {
        droppedSets++;
        return false;
      }
      return true;
    });
    if (kept.length > 0) out[buyerId] = { tendererSets: kept };
  }
  if (droppedSets > 0)
    log(
      `prune repeatWinnerIndex droppedSets=${droppedSets} minRate=${REPEAT_WINNER_MIN_RATE} buyersKept=${Object.keys(out).length}`,
    );
  return out;
}

/**
 * Persist a `Benchmark` as 1 head + 5 part docs via a single ordered
 * `bulkWrite` of 6 `replaceOne` upserts. Pruning is applied first so neither
 * the part docs nor the head doc can overflow the 16 MB BSON limit.
 *
 * Call site (`build-benchmarks.ts`) is unchanged: it still passes the full
 * validated `Benchmark` and the split is entirely internal here.
 */
export async function upsertBenchmark(doc: Benchmark): Promise<void> {
  const col = await getCollection('benchmarks');

  const splittingClusters = pruneSplittingClusters(doc.splittingClusters);
  const failedThenAwardIndex = pruneFailedThenAwardIndex(doc.failedThenAwardIndex);
  const repeatWinnerIndex = pruneRepeatWinnerIndex(doc.repeatWinnerIndex);

  const head: HeadDoc = {
    _id: doc._id,
    shardKeys: [...SHARD_KEYS],
    periodScope: doc.periodScope,
    categoryPrice: doc.categoryPrice,
    peerCategoryMedian: doc.peerCategoryMedian,
    nationalMethodBaseline: doc.nationalMethodBaseline,
    cohortStats: doc.cohortStats,
  };

  const partValues: Record<PartField, unknown> = {
    buyerMethodMix: doc.buyerMethodMix,
    buyerWeeklyBaseline: doc.buyerWeeklyBaseline,
    splittingClusters,
    failedThenAwardIndex,
    repeatWinnerIndex,
  };

  const ops: unknown[] = [
    { replaceOne: { filter: { _id: head._id }, replacement: head, upsert: true } },
  ];
  for (const field of PART_FIELDS) {
    const partId = `${doc._id}#${field}`;
    ops.push({
      replaceOne: {
        filter: { _id: partId },
        replacement: { _id: partId, [field]: partValues[field] },
        upsert: true,
      },
    });
  }

  // `ordered: true`: subsequent part writes are aborted on failure, but the
  // already-written head doc is not rolled back — `getBenchmarkByScope`
  // handles this via the `parts.length !== partIds.length` null-guard.
  await col.bulkWrite(ops as never[], { ordered: true });
  log(`upsert scope=${doc._id} head+ ${PART_FIELDS.length} parts written`);
}

/**
 * Load the full merged `Benchmark` for a scope.
 *
 *  1. `findOne({_id: scope})` → head doc.
 *  2. null → null.
 *  3. No `shardKeys` field → LEGACY monolithic doc (e.g. integration-test
 *     fixtures written via a raw `replaceOne`) — already complete, return
 *     as-is (fast path).
 *  4. Otherwise read the part docs by id and merge into the public shape.
 *     If fewer parts are found than `shardKeys` expects (partially-sharded
 *     scope from a failed write), return null rather than silently merging
 *     empty defaults — the caller treats null as a hard failure.
 */
export async function getBenchmarkByScope(scopeId: string): Promise<Benchmark | null> {
  const col = await getCollection('benchmarks');
  const head = (await col.findOne({ _id: scopeId } as never)) as
    | (Partial<Benchmark> & HeadDoc)
    | null;

  if (!head) return null;

  // Legacy fast path: a pre-sharding monolithic doc has no `shardKeys` field
  // and already carries every field.
  if (!Array.isArray((head as { shardKeys?: unknown }).shardKeys)) {
    log(`get scope=${scopeId} legacy monolithic doc (no shardKeys)`);
    return head as unknown as Benchmark;
  }

  const partIds = head.shardKeys.map((k) => `${scopeId}${k}`);
  const parts = (await col.find({ _id: { $in: partIds } } as never).toArray()) as Array<
    Record<string, unknown> & { _id: string }
  >;

  // A partially-sharded scope (head written, one+ parts missing — e.g. a
  // failed bulkWrite) would otherwise silently merge empty defaults for the
  // missing fields and feed wrong/empty indexes to detection rules. Fail
  // loud instead: return null so the caller (`runDetection`) throws.
  if (parts.length !== partIds.length) {
    log(
      `ERROR get scope=${scopeId} incomplete shards parts=${parts.length}/${partIds.length} expected=${partIds.length} — returning null`,
    );
    return null;
  }

  const byId = new Map(parts.map((p) => [p._id, p]));
  const pick = <T>(field: PartField, fallback: T): T => {
    const part = byId.get(`${scopeId}#${field}`);
    return part && part[field] !== undefined ? (part[field] as T) : fallback;
  };

  const merged: Benchmark = {
    _id: head._id,
    periodScope: head.periodScope,
    categoryPrice: head.categoryPrice,
    peerCategoryMedian: head.peerCategoryMedian,
    nationalMethodBaseline: head.nationalMethodBaseline,
    cohortStats: head.cohortStats,
    buyerMethodMix: pick('buyerMethodMix', {} as Benchmark['buyerMethodMix']),
    buyerWeeklyBaseline: pick('buyerWeeklyBaseline', {} as Benchmark['buyerWeeklyBaseline']),
    splittingClusters: pick('splittingClusters', [] as Benchmark['splittingClusters']),
    failedThenAwardIndex: pick(
      'failedThenAwardIndex',
      {} as Benchmark['failedThenAwardIndex'],
    ),
    repeatWinnerIndex: pick('repeatWinnerIndex', {} as Benchmark['repeatWinnerIndex']),
  };

  log(`get scope=${scopeId} merged head + ${parts.length}/${partIds.length} parts`);
  return merged;
}
