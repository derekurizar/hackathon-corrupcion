import { rankAndClusterCases, type CaseBundle } from '../generation/rank.js';

const log = (m: string): void => console.error(`[rank] ${m}`);

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
  const doc = (await col.findOne({} as never)) as { _id: string } | null;
  if (!doc) {
    throw new Error('No benchmarks found — run buildBenchmarks first');
  }
  return doc._id;
}

/**
 * RankAndCluster stage (Step-Functions task). Thin wrapper over
 * `rankAndClusterCases` — deterministic top-N bundles for the scope.
 */
export async function rankAndCluster(
  args: RankAndClusterArgs = {},
): Promise<RankAndClusterResult> {
  const scope = await resolveScope(args.scope);
  log(`start scope=${scope}`);
  const bundles = await rankAndClusterCases({ scope });
  log(`done cases=${bundles.length}`);
  return { scope, cases: bundles.length, bundles };
}
