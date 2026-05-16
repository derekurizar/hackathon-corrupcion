import { rankAndClusterCases, type CaseBundle } from '../generation/rank.js';
import { getAllEntities } from '../repositories/entities.js';
import { createClaudeClient } from '../generation/claude.js';
import { generateStoryGuarded } from '../generation/guardrails.js';
import { anonymizeSupplier } from '../generation/anonymize.js';
import type { Entity } from '../schema/index.js';

const log = (m: string): void => console.error(`[story] ${m}`);

export interface GenerateStoryArgs {
  scope?: string;
  bundles?: CaseBundle[];
  dryRun?: boolean;
}

export interface GenerateStoryResult {
  scope: string;
  stories: number;
  fallbacks: number;
}

/**
 * GenerateStory stage (Step-Functions `Map:GenerateStory` task). Exercises the
 * guardrail-safe generator per bundle and reports how many resorted to the
 * deterministic evidence-only fallback. Persistence is owned by the publish
 * stage (`publishInvestigations` re-runs generation behind the evidenceHash
 * guard so unchanged cases cost zero LLM calls).
 */
export async function generateStory(
  args: GenerateStoryArgs = {},
): Promise<GenerateStoryResult> {
  const scope = args.scope ?? '';
  const bundles =
    args.bundles ?? (await rankAndClusterCases({ scope }));

  if (bundles.length === 0) {
    log('no bundles');
    return { scope, stories: 0, fallbacks: 0 };
  }

  const entities = await getAllEntities();
  const entityMap = new Map<string, Entity>(
    entities.map((e) => [e._id, e]),
  );

  const client = createClaudeClient();
  let stories = 0;
  let fallbacks = 0;

  for (const bundle of bundles) {
    const supplierId = bundle.entities.supplierIds[0];
    const supplierEntity: Pick<Entity, '_id' | 'name' | 'entityType'> =
      (supplierId !== undefined
        ? entityMap.get(supplierId)
        : undefined) ?? {
        _id: supplierId ?? `${bundle.caseKey}:supplier`,
        name: '',
        entityType: 'unknown',
      };
    const anon = anonymizeSupplier(supplierEntity);
    const { usedFallback } = await generateStoryGuarded(
      client,
      bundle,
      anon.displayNameEs,
      anon.displayNameEn,
      supplierEntity.name,
      supplierEntity.entityType,
    );
    stories += 1;
    if (usedFallback) fallbacks += 1;
  }

  log(`done stories=${stories} fallbacks=${fallbacks}`);
  return { scope, stories, fallbacks };
}
