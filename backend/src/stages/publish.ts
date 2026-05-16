import {
  publishInvestigations,
  type PublishResult,
} from '../generation/publish.js';
import { getAllEntities } from '../repositories/entities.js';
import type { Entity } from '../schema/index.js';
import type { CaseBundle } from '../generation/rank.js';

const log = (m: string): void => console.error(`[publish] ${m}`);

export interface PublishStageArgs {
  runId: string;
  scope: string;
  bundles: CaseBundle[];
}

/**
 * Publish stage (Step-Functions `Publish` task). Loads entities once (for
 * publish-time anonymization), then delegates to `publishInvestigations`
 * (evidenceHash-guarded versioned upsert + Edition + dashboardStats recompute).
 */
export async function publish(
  args: PublishStageArgs,
): Promise<PublishResult> {
  log(`start runId=${args.runId} scope=${args.scope} bundles=${args.bundles.length}`);
  const entities = await getAllEntities();
  const entityMap = new Map<string, Entity>(
    entities.map((e) => [e._id, e]),
  );
  const result = await publishInvestigations({
    runId: args.runId,
    scope: args.scope,
    bundles: args.bundles,
    entityMap,
  });
  log(
    `done investigations=${result.investigations} skipped=${result.skipped} edition=${result.editionId}`,
  );
  return result;
}
