import { evidenceHash } from '../identity/index.js';
import { moduleLogger } from '../obs/logger.js';
import { writePublishArtifact } from '../obs/publish-artifact.js';
import {
  InvestigationSchema,
  type Investigation,
  type StoryContentEs,
  type StoryContentEn,
  type Entity,
  type Signal,
} from '../schema/index.js';
import type {
  Chapter,
  SceneSignal,
  SceneEvidenceItem,
  SceneInvestigation,
} from '../scene-contract/types.js';
import { validateScenePlan } from '../scene-contract/validator.js';
import { reviewPriority } from '../detection/review-priority.js';
import { formatBenchmark } from '../scene-contract/benchmark.js';
import { getByCaseKey, upsertInvestigationGuarded } from '../repositories/investigations.js';
import { insertEdition } from '../repositories/editions.js';
import { upsertDashboardStats } from '../repositories/dashboard-stats.js';
import { createClaudeClient } from './claude.js';
import { generateStoryGuarded } from './guardrails.js';
import { anonymizeSupplier, type AnonymizedSupplier } from './anonymize.js';
import { buildCaseDigest, resolveDigestConfig, type CaseDigest } from './digest.js';
import { loadConfig } from '../config/env.js';
import { resolveScenePlan, collectSceneZodFailures } from './scene-plan.js';
import { buildEdition, recomputeDashboardStats } from './editions.js';
import { FIXED_CAVEAT_ES, FIXED_CAVEAT_EN } from './prompt.js';
import type { CaseBundle } from './rank.js';

const log = moduleLogger('publish');

/** Truncate a free-text value for grep-friendly key=value logging. */
function trunc(s: string, max = 40): string {
  return s.length > max ? `${s.slice(0, max)}...` : s;
}

export interface PublishArgs {
  runId: string;
  scope: string;
  bundles: CaseBundle[];
  /** Passed in so we don't re-query entities per bundle. */
  entityMap: Map<string, Entity>;
}

export interface PublishResult {
  investigations: number;
  skipped: number;
  editionId: string;
}

/** Max money-hinted numeric evidence (same formula as rank/editions). */
function bundleTotalValue(bundle: CaseBundle): number {
  let max = 0;
  let found = false;
  for (const e of bundle.evidence) {
    const f = e.field.toLowerCase();
    if (
      (f.includes('value') || f.includes('amount')) &&
      typeof e.value === 'number' &&
      Number.isFinite(e.value)
    ) {
      if (!found || e.value > max) {
        max = e.value;
        found = true;
      }
    }
  }
  return found ? max : 0;
}

/**
 * The full flattened evidence can be tens of thousands of rows, which
 * overflows MongoDB's ~17 MB BSON document buffer. We persist a LOCKED-ORDER
 * PREFIX (identical indices, so every `ev:<i>` stays stable). The prefix is
 * `floor` long, auto-grown only if a resolved scenePlan ref needs a higher
 * index — so every persisted `ev:<i>` still resolves on the SPA (published
 * docs carry no signals; the SPA flattens `evidence` alone). Pure/deterministic.
 */
export function boundPersistedEvidence<T>(
  evidence: T[],
  scenePlan: Record<string, unknown>,
  floor: number,
): { evidence: T[]; cap: number } {
  let maxRef = -1;
  for (const m of JSON.stringify(scenePlan).matchAll(/ev:(\d+)/g)) {
    const i = Number.parseInt(m[1]!, 10);
    if (i > maxRef) maxRef = i;
  }
  const cap = Math.max(floor, maxRef + 1);
  return {
    evidence: evidence.length > cap ? evidence.slice(0, cap) : evidence,
    cap,
  };
}

/** Max money-hinted numeric evidence value on a signal (0 when none). */
function signalMoneyValue(s: Signal): number {
  let max = 0;
  for (const e of s.evidence) {
    const f = e.field.toLowerCase();
    if (
      (f.includes('value') || f.includes('amount')) &&
      typeof e.value === 'number' &&
      Number.isFinite(e.value) &&
      e.value > max
    ) {
      max = e.value;
    }
  }
  return max;
}

/**
 * `deriveFromEvidence` flattens EVERY signal's evidence, so an uncapped case
 * (60k+ signals) yields a multi-MB scenePlan that overflows BSON. We feed
 * scene derivation + persistence a bounded, representative set: per rule, the
 * top `perRuleCap` signals by money value (then ocid, deterministic), always
 * keeping ≥1 benchmark-bearing signal so `hasBenchmark`/variant shortlists and
 * every fired `rule_id` (→ scene shortlist) are preserved. Digest, generation,
 * `evidenceHash`, `totalValue` and `reviewPriority` still use the FULL set.
 * Pure/deterministic.
 */
export function boundCaseSignals(signals: Signal[], perRuleCap: number): Signal[] {
  const byRule = new Map<string, Signal[]>();
  for (const s of signals) {
    const arr = byRule.get(s.rule_id);
    if (arr) arr.push(s);
    else byRule.set(s.rule_id, [s]);
  }
  const ruleIds = [...byRule.keys()].sort((a, b) => a.localeCompare(b));
  const out: Signal[] = [];
  for (const ruleId of ruleIds) {
    const arr = [...byRule.get(ruleId)!].sort((a, b) => {
      const av = signalMoneyValue(a);
      const bv = signalMoneyValue(b);
      return av !== bv ? bv - av : a.ocid.localeCompare(b.ocid);
    });
    const picked = arr.slice(0, Math.max(perRuleCap, 1));
    const hasBench = (x: Signal): boolean => x.evidence.some((e) => e.benchmark !== undefined);
    if (!picked.some(hasBench)) {
      const firstBench = arr.find(hasBench);
      if (firstBench !== undefined) picked[picked.length - 1] = firstBench;
    }
    out.push(...picked);
  }
  return out;
}

/** Locked-order evidence flatten (rule_id ASC, ocid ASC) — see rank.ts. */
function flattenLocked(signals: Signal[]): Signal['evidence'] {
  const sorted = [...signals].sort((a, b) => {
    const byRule = a.rule_id.localeCompare(b.rule_id);
    return byRule !== 0 ? byRule : a.ocid.localeCompare(b.ocid);
  });
  const flat: Signal['evidence'] = [];
  for (const s of sorted) for (const e of s.evidence) flat.push(e);
  return flat;
}

/** Headline + per-rule rollup as a single deterministic fact string (ES). */
function summaryFactsEs(d: CaseDigest): string {
  const parts = [
    `Valor señalado: ${d.headline.totalValue} GTQ`,
    `Contratos: ${d.headline.contractCount}`,
  ];
  if (d.headline.dateRange) {
    parts.push(`Periodo: ${d.headline.dateRange.min} a ${d.headline.dateRange.max}`);
  }
  for (const r of d.rules.slice(0, 4)) {
    parts.push(`${r.ruleId}: ${r.signalCount} señales`);
  }
  return parts.join('; ');
}

/** Headline + per-rule rollup as a single deterministic fact string (EN). */
function summaryFactsEn(d: CaseDigest): string {
  const parts = [
    `Value flagged: ${d.headline.totalValue} GTQ`,
    `Contracts: ${d.headline.contractCount}`,
  ];
  if (d.headline.dateRange) {
    parts.push(`Period: ${d.headline.dateRange.min} to ${d.headline.dateRange.max}`);
  }
  for (const r of d.rules.slice(0, 4)) {
    parts.push(`${r.ruleId}: ${r.signalCount} signals`);
  }
  return parts.join('; ');
}

/** A minimal, schema-valid ES story built ONLY from the deterministic digest. */
function buildEvidenceOnlySummaryEs(d: CaseDigest, supplier: AnonymizedSupplier): StoryContentEs {
  const findings = d.rules
    .slice(0, 6)
    .map(
      (r) =>
        `${r.explanation} — ${r.signalCount} señales en ` +
        `${r.distinctContracts} contratos (valor representativo ` +
        `${r.representativeValue} GTQ)`,
    );
  const facts = summaryFactsEs(d);
  return {
    cover: {
      kicker: 'Compras públicas',
      headline: `${d.buyer.name} — señales de revisión`,
      dek: 'Resumen de evidencia (generación determinista).',
    },
    elCaso: `Señales de revisión para ${d.buyer.name} relacionadas con ${supplier.displayNameEs}. ${facts}`,
    sigueElDinero: facts || 'Datos públicos en revisión.',
    lasConexiones: `Relación comprador → proveedor (${supplier.displayNameEs}).`,
    cronologia: d.headline.dateRange
      ? `Actividad observada entre ${d.headline.dateRange.min} y ${d.headline.dateRange.max}.`
      : 'Cronología derivada de los datos públicos.',
    cierre: {
      queSignificaYQueNo:
        'Estas son señales que merecen revisión por periodistas, auditores o instituciones.',
      caveat: FIXED_CAVEAT_ES,
    },
    keyFindings: findings.length > 0 ? findings : ['Datos públicos en revisión.'],
  };
}

/** A minimal, schema-valid EN story built ONLY from the deterministic digest. */
function buildEvidenceOnlySummaryEn(d: CaseDigest, supplier: AnonymizedSupplier): StoryContentEn {
  const findings = d.rules
    .slice(0, 6)
    .map(
      (r) =>
        `${r.explanation} — ${r.signalCount} signals across ` +
        `${r.distinctContracts} contracts (representative value ` +
        `${r.representativeValue} GTQ)`,
    );
  const facts = summaryFactsEn(d);
  return {
    cover: {
      kicker: 'Public procurement',
      headline: `${d.buyer.name} — review signals`,
      dek: 'Evidence summary (deterministic generation).',
    },
    theCase: `Review signals for ${d.buyer.name} involving ${supplier.displayNameEn}. ${facts}`,
    followTheMoney: facts || 'Public data under review.',
    theConnections: `Buyer → supplier relationship (${supplier.displayNameEn}).`,
    timeline: d.headline.dateRange
      ? `Activity observed between ${d.headline.dateRange.min} and ${d.headline.dateRange.max}.`
      : 'Timeline derived from the public data.',
    closing: {
      whatItMeans:
        'These are signals that deserve review by journalists, auditors, or institutions.',
      caveat: FIXED_CAVEAT_EN,
    },
    keyFindings: findings.length > 0 ? findings : ['Public data under review.'],
  };
}

function toSceneSignals(bundle: CaseBundle): SceneSignal[] {
  return bundle.signals.map((s) => ({
    rule_id: s.rule_id,
    ocid: s.ocid,
    family: s.family,
    severity: s.severity,
    evidence: s.evidence.map((e) => ({
      field: e.field,
      value: e.value,
      ...(e.comparison !== undefined ? { comparison: e.comparison } : {}),
      ...(e.benchmark !== undefined ? { benchmark: formatBenchmark(e.benchmark) } : {}),
    })),
  }));
}

/**
 * Publish stage (idea/04 §"Article identity & dedup"). Per bundle: skip on a
 * matching `evidenceHash` (zero LLM/audio), else generate a guardrail-safe
 * story (or the deterministic evidence-only fallback), build the full
 * Investigation (all 7 scenePlan chapters via the Area 06 validator),
 * `InvestigationSchema.parse` fail-loud, then evidenceHash-guarded upsert with
 * a version bump. After all bundles: write the Edition + recompute
 * `dashboardStats` from the collections.
 */
export async function publishInvestigations(args: PublishArgs): Promise<PublishResult> {
  let investigations = 0;
  let skipped = 0;
  let fallbacks = 0;
  let client: ReturnType<typeof createClaudeClient> | null = null;
  const total = args.bundles.length;
  let idx = 0;

  for (const bundle of args.bundles) {
    idx += 1;
    log(
      `processing case=${idx}/${total} caseKey=${bundle.caseKey} ` +
        `buyer="${trunc(bundle.buyer.name)}" family=${bundle.family}`,
    );
    const hash = evidenceHash(bundle.signals);
    const existing = await getByCaseKey(bundle.caseKey);
    if (existing?.evidenceHash === hash) {
      log(`SKIP case=${bundle.caseKey} evidenceHash unchanged ` + `(hash=${hash.slice(0, 8)}...)`);
      skipped += 1;
      continue;
    }

    const supplierId = bundle.entities.supplierIds[0];
    const supplierEntity: Pick<Entity, '_id' | 'name' | 'entityType'> = (supplierId !== undefined
      ? args.entityMap.get(supplierId)
      : undefined) ?? {
      _id: supplierId ?? `${bundle.caseKey}:supplier`,
      name: '',
      entityType: 'unknown',
    };
    const anon = anonymizeSupplier(supplierEntity);

    if (client === null) client = createClaudeClient();
    const { story, usedFallback } = await generateStoryGuarded(
      client,
      bundle,
      anon.displayNameEs,
      anon.displayNameEn,
      supplierEntity.name,
      supplierEntity.entityType,
    );

    let storyEs: StoryContentEs;
    let storyEn: StoryContentEn;
    let llmScenePlan: Record<string, { sceneId: string; params: Record<string, unknown> }>;
    if (!usedFallback && story !== null) {
      storyEs = story.es;
      storyEn = story.en;
      llmScenePlan = story.scenePlan;
    } else {
      const digest = buildCaseDigest(bundle, resolveDigestConfig());
      storyEs = buildEvidenceOnlySummaryEs(digest, anon);
      storyEn = buildEvidenceOnlySummaryEn(digest, anon);
      // Empty llmScenePlan → resolveScenePlan derives every chapter from
      // evidence (source:'fallback'), so all 7 chapters are still present.
      llmScenePlan = {};
    }

    const totalValue = bundleTotalValue(bundle);
    // Scene derivation + persistence run on a bounded representative set so the
    // derived scenePlan (deriveFromEvidence flattens every signal's evidence)
    // and signalIds don't overflow BSON. Digest/generation/hash use FULL.
    const sceneBundleSignals = boundCaseSignals(
      bundle.signals,
      loadConfig().MAX_SCENE_SIGNALS_PER_RULE,
    );
    const boundedEvidence = flattenLocked(sceneBundleSignals);
    if (sceneBundleSignals.length < bundle.signals.length) {
      log(
        `signals bounded case=${bundle.caseKey} ` +
          `kept=${sceneBundleSignals.length}/${bundle.signals.length} ` +
          `evidence=${boundedEvidence.length}/${bundle.evidence.length}`,
      );
    }
    const sceneSignals = toSceneSignals({
      ...bundle,
      signals: sceneBundleSignals,
    });
    const sceneEvidence: SceneEvidenceItem[] = boundedEvidence.map((e) => ({
      field: e.field,
      value: e.value,
      ...(e.comparison !== undefined ? { comparison: e.comparison } : {}),
      ...(e.benchmark !== undefined ? { benchmark: formatBenchmark(e.benchmark) } : {}),
    }));
    const priority = reviewPriority(bundle.signals);
    const sceneInvestigation: SceneInvestigation = {
      buyer: bundle.buyer,
      supplier: anon,
      reviewPriority: priority,
      totalValue,
      currency: 'GTQ',
      evidence: sceneEvidence,
    };

    if (usedFallback) fallbacks += 1;

    // FULL locked scene signals for ref resolution only. The LLM's `ev:<i>`
    // indices come from the digest (built over the full evidence), so
    // `validateScenePlan` must resolve refs against the full set, not the
    // bounded BSON-safe `sceneSignals`/`sceneEvidence`. Passing `[]` as the
    // resolve-evidence makes `flattenCaseEvidence(fullSignals, [])` reproduce
    // the exact digest `ev:<i>` ordering (sorted signals' evidence).
    const resolveSceneSignals = toSceneSignals(bundle);
    const resolvedScenePlan = resolveScenePlan(
      bundle.firedRuleIds,
      llmScenePlan,
      sceneSignals,
      sceneEvidence,
      sceneInvestigation,
      bundle.caseKey,
      resolveSceneSignals,
      [],
    );

    // Targeted LLM repair: any chapter that fell back purely on the Zod
    // schema gate (sceneId is valid, params aren't) gets its exact issues
    // sent back to the model to fix ONLY the broken fields, then is
    // re-validated. Successful fixes replace the deterministic fallback so
    // the article keeps the LLM's content. One corrective shot; on any
    // failure the deterministic fallback already in place stands.
    if (!usedFallback && client !== null) {
      const zodFailures = collectSceneZodFailures(llmScenePlan, resolvedScenePlan);
      if (zodFailures.length > 0) {
        const fixed = await client.repairScenes({
          caseKey: bundle.caseKey,
          failures: zodFailures,
        });
        for (const [chapter, fx] of Object.entries(fixed)) {
          const revalidated = validateScenePlan(
            chapter as Chapter,
            { sceneId: fx.sceneId, params: fx.params, source: 'llm' },
            sceneSignals,
            sceneEvidence,
            sceneInvestigation,
            resolveSceneSignals,
            [],
          );
          if (revalidated.source === 'llm') {
            resolvedScenePlan[chapter] = revalidated;
            log(`scene_repair OK case=${bundle.caseKey} chapter=${chapter}`);
          } else {
            log(
              `scene_repair STILL_INVALID case=${bundle.caseKey} ` +
                `chapter=${chapter}`,
            );
          }
        }
      }
    }

    const { evidence: persistEvidence, cap: evCap } = boundPersistedEvidence(
      boundedEvidence,
      resolvedScenePlan,
      loadConfig().MAX_PERSISTED_EVIDENCE,
    );
    if (persistEvidence.length < boundedEvidence.length) {
      log(
        `evidence capped case=${bundle.caseKey} ` +
          `kept=${persistEvidence.length}/${boundedEvidence.length} cap=${evCap}`,
      );
    }

    const version = existing ? existing.version + 1 : 1;
    const doc: Investigation = {
      _id: bundle.caseKey,
      buyer: bundle.buyer,
      supplier: anon,
      signalFamily: bundle.family,
      timeWindow: bundle.scope,
      reviewPriority: priority,
      ruleIds: bundle.firedRuleIds,
      // Bounded provenance sample — full signals live in the `signals`
      // collection; persisting all 60k+ ids overflows BSON.
      signalIds: sceneBundleSignals.map((s) => s._id),
      totalValue,
      currency: 'GTQ',
      es: storyEs,
      en: storyEn,
      scenePlan: resolvedScenePlan,
      evidence: persistEvidence,
      evidenceHash: hash,
      version,
      status: 'published',
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    let parsed: Investigation;
    try {
      parsed = InvestigationSchema.parse(doc);
    } catch (err) {
      log(
        `ERROR case=${bundle.caseKey} schema validation failed: ` +
          `${err instanceof Error ? err.message : String(err)}`,
      );
      throw err;
    }
    // Dump the validated doc *before* the upsert so every published case
    // (including ones the evidenceHash guard skips) is inspectable on disk.
    if (loadConfig().PUBLISH_ARTIFACTS) {
      await writePublishArtifact(args.runId, parsed);
    }
    await upsertInvestigationGuarded(parsed, existing?.evidenceHash);
    log(
      `WRITE case=${bundle.caseKey} version=${version} ` +
        `(${existing ? 'updated' : 'new'}) ` +
        `supplier="${trunc(anon.displayNameEs)}" ` +
        `isIndividual=${anon.isIndividual} usedFallback=${usedFallback}`,
    );
    investigations += 1;
  }

  log(`summary written=${investigations} skipped=${skipped} ` + `fallbacks=${fallbacks}`);

  const edition = buildEdition(args.runId, new Date().toISOString(), args.bundles);
  await insertEdition(edition);
  log(
    `edition editionId=${edition._id} leadCase=${edition.leadCaseKey} ` +
      `highlights=[${edition.highlightCaseKeys.join(',')}]`,
  );
  const stats = await recomputeDashboardStats();
  await upsertDashboardStats(stats);
  log(
    `dashboardStats updated investigations=${stats.counters.investigations} ` +
      `high=${stats.priorityDist.high} medium=${stats.priorityDist.medium} ` +
      `low=${stats.priorityDist.low}`,
  );

  return { investigations, skipped, editionId: edition._id };
}
