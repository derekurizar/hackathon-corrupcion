import { loadConfig } from '../config/env.js';
import { rankAndCluster } from './rank-and-cluster.js';
import { generateStory } from './generate-story.js';
import { publish } from './publish.js';
import { generateAudio, type AudioItem } from '../generation/audio.js';
import { getAllEntities } from '../repositories/entities.js';
import { getByCaseKey } from '../repositories/investigations.js';
import { createClaudeClient } from '../generation/claude.js';
import { generateStoryGuarded } from '../generation/guardrails.js';
import { anonymizeSupplier } from '../generation/anonymize.js';
import {
  startRun,
  markStage,
  setCounts,
  appendError,
  finishRun,
} from '../repositories/pipeline-runs.js';
import type { Entity } from '../schema/index.js';

const log = (m: string): void => console.error(`[generate] ${m}`);

export interface GenerateArgs {
  scope?: string;
  dryRun?: boolean;
}

export interface GenerateResult {
  scope: string;
  cases: number;
  investigations: number;
  skipped: number;
  audioUploaded?: number;
}

/**
 * CLI dev-loop orchestrator (idea/07 §"Editions & dashboard stats"). Chains
 * rank → story → audio → publish, honoring `RUN_STORY`/`RUN_AUDIO`/
 * `RUN_PUBLISH` via `loadConfig()`. Writes `pipelineRuns` stage status for the
 * `story` and `publish` stages. `generateAudio` returns bytes only — the
 * caller (data-integestion CLI / infra glue) owns the S3 write, so this
 * returns `audioItems` for the caller to persist.
 */
export async function generate(
  args: GenerateArgs = {},
): Promise<GenerateResult & { audioItems?: AudioItem[] }> {
  const cfg = loadConfig();
  const runId = await startRun({
    months: [],
    toggles: {
      story: cfg.RUN_STORY,
      audio: cfg.RUN_AUDIO,
      publish: cfg.RUN_PUBLISH,
    },
  });

  try {
    const ranked = await rankAndCluster({
      ...(args.scope !== undefined ? { scope: args.scope } : {}),
    });
    const { scope, bundles } = ranked;
    log(`ranked cases=${bundles.length} scope=${scope}`);

    if (cfg.RUN_STORY) {
      await markStage(runId, 'story', 'running');
      const sr = await generateStory({ scope, bundles });
      log(`story stories=${sr.stories} fallbacks=${sr.fallbacks}`);
      await markStage(runId, 'story', 'done');
    } else {
      log('story skipped via RUN_STORY=false');
      await markStage(runId, 'story', 'skipped');
    }

    const audioItems: AudioItem[] = [];
    if (cfg.RUN_AUDIO && bundles.length > 0) {
      await markStage(runId, 'audio', 'running');
      const voiceEs = cfg.ELEVENLABS_VOICE_ES ?? '';
      const voiceEn = cfg.ELEVENLABS_VOICE_EN ?? '';
      if (voiceEs === '' || voiceEn === '') {
        log('audio skipped — ELEVENLABS_VOICE_ES/EN not set');
        await markStage(runId, 'audio', 'skipped');
      } else {
        const entities = await getAllEntities();
        const entityMap = new Map<string, Entity>(
          entities.map((e) => [e._id, e]),
        );
        const client = createClaudeClient();
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
          const { story } = await generateStoryGuarded(
            client,
            bundle,
            anon.displayNameEs,
            anon.displayNameEn,
            supplierEntity.name,
            supplierEntity.entityType,
          );
          if (story === null) continue; // fallback summary → no podcast audio
          const existing = await getByCaseKey(bundle.caseKey);
          const audioVersion = (existing?.version ?? 0) + 1;
          const out = await generateAudio({
            caseKey: bundle.caseKey,
            version: audioVersion,
            podcast: story.podcast,
            voices: { es: voiceEs, en: voiceEn },
          });
          audioItems.push(...out.items);
        }
        log(`audio items=${audioItems.length}`);
        await markStage(runId, 'audio', 'done');
      }
    } else if (!cfg.RUN_AUDIO) {
      log('audio skipped via RUN_AUDIO=false');
      await markStage(runId, 'audio', 'skipped');
    }

    let investigations = 0;
    let skipped = 0;
    if (cfg.RUN_PUBLISH) {
      await markStage(runId, 'publish', 'running');
      const pr = await publish({ runId, scope, bundles });
      investigations = pr.investigations;
      skipped = pr.skipped;
      log(
        `publish investigations=${investigations} skipped=${skipped} edition=${pr.editionId}`,
      );
      await markStage(runId, 'publish', 'done');
    } else {
      log('publish skipped via RUN_PUBLISH=false');
      await markStage(runId, 'publish', 'skipped');
    }

    await setCounts(runId, {
      recordsIngested: 0,
      signals: 0,
      investigations,
    });
    await finishRun(runId);

    return {
      scope,
      cases: bundles.length,
      investigations,
      skipped,
      ...(audioItems.length > 0 ? { audioUploaded: audioItems.length } : {}),
      ...(audioItems.length > 0 ? { audioItems } : {}),
    };
  } catch (err) {
    await appendError(runId, {
      stage: 'generate',
      message: err instanceof Error ? err.message : String(err),
    });
    await finishRun(runId);
    throw err;
  }
}
