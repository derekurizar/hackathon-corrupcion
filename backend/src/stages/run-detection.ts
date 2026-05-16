import { createHash } from 'node:crypto';
import { loadConfig } from '../config/env.js';
import { caseKey } from '../identity/index.js';
import { SignalSchema, type Signal } from '../schema/signals.js';
import type { Benchmark } from '../schema/benchmarks.js';
import {
  iterateCuratedReleases,
  getBenchmarkByScope,
  deleteSignalsByScope,
  insertSignals,
} from '../repositories/index.js';
import { getAllEntities } from '../repositories/entities.js';
import {
  startRun,
  markStage,
  setCounts,
  appendError,
  finishRun,
} from '../repositories/pipeline-runs.js';
import { RULES } from '../detection/registry.js';
import '../detection/rules/index.js'; // side-effect: populate RULES
import { defaultRuleConfig } from '../detection/config.js';
import { createEntityIndexBuilder } from '../detection/entity-index.js';
import type { RuleContext } from '../detection/types.js';

export interface RunDetectionArgs {
  /** Scope label (`scope:YYYY-MM..YYYY-MM`). Optional — derived from the
   * benchmark `_id` when omitted. */
  scope?: string;
  /** Run rules + count but perform NO DB writes (no delete, no insert). */
  dryRun?: boolean;
}

export interface RunDetectionResult {
  scope: string;
  signals: number;
  releases: number;
  runId?: string;
}

const log = (m: string): void => console.error(`[detection] ${m}`);

const sha256 = (s: string): string =>
  createHash('sha256').update(s).digest('hex');

/**
 * Detection stage (replaces the Area 01 throwing stub; same exported symbol
 * `runDetection`). Loads the scope benchmark, builds an `EntityIndex` from one
 * corpus pass, then a SECOND corpus pass applies every `RULES` entry per
 * release. Signals are validated against `SignalSchema` and bulk-inserted;
 * `signal_id` is deterministic so a re-run (delete-by-scope + reinsert) over
 * an unchanged corpus yields identical counts. NEVER `.toArray()`s the cursor.
 */
export async function runDetection(
  args: RunDetectionArgs = {},
): Promise<RunDetectionResult> {
  const cfg = loadConfig();

  if (!cfg.RUN_DETECTION && !args.dryRun) {
    log('skipped via RUN_DETECTION=false');
    return { scope: args.scope ?? '', signals: 0, releases: 0 };
  }

  // Resolve the benchmark + scope. If no scope arg, take the (single) latest
  // benchmark doc by scanning — but the contract is one scope, so the caller
  // normally passes it. We require an explicit benchmark for the scope.
  let scope = args.scope ?? '';
  let benchmarks: Benchmark | null = scope
    ? await getBenchmarkByScope(scope)
    : null;
  if (!benchmarks) {
    // Fall back: derive scope from the only benchmark in the collection.
    const { getCollection } = await import('../db/collections.js');
    const col = await getCollection('benchmarks');
    const doc = (await col.findOne({} as never)) as Benchmark | null;
    if (doc) {
      benchmarks = doc;
      scope = doc._id;
    }
  }
  if (!benchmarks) {
    throw new Error(
      `No benchmarks found for scope: ${args.scope ?? '(any)'} — run buildBenchmarks first`,
    );
  }

  log(`start scope=${scope}`);

  let runId: string | undefined;
  if (!args.dryRun) {
    runId = await startRun({ months: [], toggles: { detection: true } });
    await markStage(runId, 'detection', 'running');
  }

  let releases = 0;
  let signalCount = 0;
  try {
    const t0 = Date.now();
    const allSignals: Signal[] = [];

    // Pass 1 — build the entity index (rollups + per-buyer supplier maps).
    log(`pass1 building entity index...`);
    const entities = await getAllEntities();
    const builder = createEntityIndexBuilder(entities);
    for await (const release of iterateCuratedReleases({ scope })) {
      builder.observe(release);
    }
    const entityIndex = builder.finish();
    log(`pass1 complete entities=${entities.length}`);

    if (!args.dryRun) await deleteSignalsByScope(scope);

    // Pass 2 — apply rules per release.
    log(`pass2 running ${RULES.length} rules...`);
    for await (const release of iterateCuratedReleases({ scope })) {
      releases++;
      const ctx: RuleContext = {
        release,
        benchmarks,
        entities: entityIndex,
        config: defaultRuleConfig,
      };
      const raw = RULES.flatMap((rule) => {
        try {
          return rule.run(ctx);
        } catch {
          return [];
        }
      });

      const docs: Signal[] = [];
      raw.forEach((s, idx) => {
        const signal: Signal = {
          _id: sha256(`${s.rule_id}|${s.ocid}|${scope}|${idx}`),
          ocid: s.ocid,
          caseKey: caseKey(s.primaryEntityId, s.family, scope),
          rule_id: s.rule_id,
          family: s.family,
          severity: s.severity,
          confidence: s.confidence,
          primaryEntityId: s.primaryEntityId,
          secondaryEntityIds: s.secondaryEntityIds ?? [],
          timeWindow: scope,
          title: s.title,
          explanation: s.explanation,
          story_angle: s.story_angle,
          evidence: s.evidence.map((e) => ({
            field: e.field,
            value: e.value,
            ...(e.comparison !== undefined ? { comparison: e.comparison } : {}),
            ...(e.benchmark !== undefined ? { benchmark: e.benchmark } : {}),
          })),
        };
        const parsed = SignalSchema.safeParse(signal);
        if (parsed.success) docs.push(parsed.data);
      });

      if (docs.length > 0) {
        allSignals.push(...docs);
        signalCount += docs.length;
      }
      if (releases % 1000 === 0)
        log(
          `pass2 progress releases=${releases} signals=${signalCount} elapsed=${((Date.now() - t0) / 1000).toFixed(1)}s`,
        );
    }

    // Flush all accumulated signals after pass 2 is complete.
    if (!args.dryRun && allSignals.length > 0) {
      const CHUNK = 500;
      for (let i = 0; i < allSignals.length; i += CHUNK) {
        const slice = allSignals.slice(i, i + CHUNK);
        await insertSignals(slice);
        log(`signals flushed ${i + slice.length}/${allSignals.length}`);
      }
    }
    log(
      `done scope=${scope} releases=${releases} signals=${signalCount} elapsed=${((Date.now() - t0) / 1000).toFixed(1)}s`,
    );
  } catch (err) {
    if (runId) {
      await appendError(runId, {
        stage: 'detection',
        releases,
        message: err instanceof Error ? err.message : String(err),
      });
      await markStage(runId, 'detection', 'failed');
      await finishRun(runId);
    }
    throw err;
  }

  if (runId) {
    await setCounts(runId, {
      recordsIngested: 0,
      signals: signalCount,
      investigations: 0,
    });
    await markStage(runId, 'detection', 'done');
    await finishRun(runId);
  }

  return {
    scope,
    signals: signalCount,
    releases,
    ...(runId !== undefined ? { runId } : {}),
  };
}
