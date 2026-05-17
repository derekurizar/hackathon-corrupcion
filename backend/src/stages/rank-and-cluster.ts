import { rankAndClusterCases, type CaseBundle } from '../generation/rank.js';
import { moduleLogger } from '../obs/logger.js';

const log = moduleLogger('rank');

export interface RankAndClusterArgs {
  /** Scope label (`scope:YYYY-MM..YYYY-MM`). Derived from the benchmark
   * collection when omitted (mirrors run-detection). */
  scope?: string;
  dryRun?: boolean;
}

export interface RankAndClusterResult {
  scope: string;
  cases: number;
  bundles: CaseBundle[];
}

/** Resolves the scope from the (single) benchmark doc when not passed. */
async function resolveScope(scope?: string): Promise<string> {
  if (scope !== undefined && scope !== '') return scope;
  const { getCollection } = await import('../db/collections.js');
  const col = await getCollection('benchmarks');
  // After repo-layer sharding the collection holds 6 docs per scope (1 head
  // + 5 parts). A plain `findOne({})` has no ordering guarantee and may
  // return a part-doc first (e.g. `scope:…#splittingClusters`), whose `_id`
  // would then be misread as a valid scope. Mirror the two-stage strategy in
  // run-detection so we always resolve to a head/monolithic doc.
  // Stage 1: prefer sharded HEAD docs (they carry `shardKeys`).
  const headDoc = (await col.findOne({ shardKeys: { $exists: true } } as never)) as {
    _id: string;
  } | null;
  // Stage 2: fall back to any doc (legacy monolithic docs lack `shardKeys`).
  const anyDoc =
    headDoc ?? ((await col.findOne({} as never)) as { _id: string } | null);
  // Guard: discard any part-doc that leaked through (its _id contains '#').
  const doc = anyDoc?._id.includes('#') ? null : anyDoc;
  if (!doc) {
    throw new Error('No benchmarks found — run buildBenchmarks first');
  }
  return doc._id;
}

/**
 * RankAndCluster stage (Step-Functions task). Thin wrapper over
 * `rankAndClusterCases` — deterministic top-N bundles for the scope.
 */
export async function rankAndCluster(args: RankAndClusterArgs = {}): Promise<RankAndClusterResult> {
  const scope = await resolveScope(args.scope);
  log(`start scope=${scope}`);
  const bundles = await rankAndClusterCases({ scope });
  log(`done cases=${bundles.length}`);
  return { scope, cases: bundles.length, bundles };
}
