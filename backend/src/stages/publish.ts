import { publishInvestigations, type PublishResult } from '../generation/publish.js';
import { moduleLogger } from '../obs/logger.js';
import { getAllEntities } from '../repositories/entities.js';
import type { Entity } from '../schema/index.js';
import type { CaseBundle } from '../generation/rank.js';
import type { GuardedStoryResult } from '../generation/guardrails.js';

const log = moduleLogger('publish');

export interface PublishStageArgs {
  runId: string;
  scope: string;
  bundles: CaseBundle[];
  /**
   * Optional per-run story cache, populated by the audio phase of `generate()`.
   * When present, publish reuses each case's already-generated story instead of
   * calling Claude a second time. Absent on the standalone `publish` CLI path
   * (cache-miss → publish generates normally, behavior unchanged).
   */
  storyCache?: Map<string, GuardedStoryResult>;
}

/**
 * Publish stage (Step-Functions `Publish` task). Loads entities once (for
 * publish-time anonymization), then delegates to `publishInvestigations`
 * (evidenceHash-guarded versioned upsert + Edition + dashboardStats recompute).
 */
export async function publish(args: PublishStageArgs): Promise<PublishResult> {
  log(`start runId=${args.runId} scope=${args.scope} bundles=${args.bundles.length}`);
  const entities = await getAllEntities();
  const entityMap = new Map<string, Entity>(entities.map((e) => [e._id, e]));
  const result = await publishInvestigations({
    runId: args.runId,
    scope: args.scope,
    bundles: args.bundles,
    entityMap,
    ...(args.storyCache ? { storyCache: args.storyCache } : {}),
  });
  log(
    `done investigations=${result.investigations} skipped=${result.skipped} edition=${result.editionId}`,
  );
  return result;
}
