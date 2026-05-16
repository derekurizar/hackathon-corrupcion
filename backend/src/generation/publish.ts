import { evidenceHash } from '../identity/index.js';
import {
  InvestigationSchema,
  type Investigation,
  type StoryContentEs,
  type StoryContentEn,
  type Entity,
} from '../schema/index.js';
import type {
  SceneSignal,
  SceneEvidenceItem,
  SceneInvestigation,
} from '../scene-contract/types.js';
import { reviewPriority } from '../detection/review-priority.js';
import {
  getByCaseKey,
  upsertInvestigationGuarded,
} from '../repositories/investigations.js';
import { insertEdition } from '../repositories/editions.js';
import { upsertDashboardStats } from '../repositories/dashboard-stats.js';
import { createClaudeClient } from './claude.js';
import { generateStoryGuarded } from './guardrails.js';
import { anonymizeSupplier, type AnonymizedSupplier } from './anonymize.js';
import { resolveScenePlan } from './scene-plan.js';
import { buildEdition, recomputeDashboardStats } from './editions.js';
import { FIXED_CAVEAT_ES, FIXED_CAVEAT_EN } from './prompt.js';
import type { CaseBundle } from './rank.js';

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

/** A minimal, schema-valid ES story built ONLY from signal/evidence fields. */
function buildEvidenceOnlySummaryEs(
  bundle: CaseBundle,
  supplier: AnonymizedSupplier,
): StoryContentEs {
  const findings = bundle.signals.slice(0, 5).map((s) => s.explanation);
  const facts = bundle.evidence
    .slice(0, 6)
    .map((e) => `${e.field}: ${String(e.value)}`)
    .join('; ');
  return {
    cover: {
      kicker: 'Compras públicas',
      headline: `${bundle.buyer.name} — señales de revisión`,
      dek: 'Resumen de evidencia (generación determinista).',
    },
    elCaso: `Señales de revisión para ${bundle.buyer.name} relacionadas con ${supplier.displayNameEs}. ${facts}`,
    sigueElDinero: facts || 'Datos públicos en revisión.',
    lasConexiones: `Relación comprador → proveedor (${supplier.displayNameEs}).`,
    cronologia: 'Cronología derivada de los datos públicos.',
    cierre: {
      queSignificaYQueNo:
        'Estas son señales que merecen revisión por periodistas, auditores o instituciones.',
      caveat: FIXED_CAVEAT_ES,
    },
    keyFindings: findings.length > 0 ? findings : ['Datos públicos en revisión.'],
  };
}

/** A minimal, schema-valid EN story built ONLY from signal/evidence fields. */
function buildEvidenceOnlySummaryEn(
  bundle: CaseBundle,
  supplier: AnonymizedSupplier,
): StoryContentEn {
  const findings = bundle.signals.slice(0, 5).map((s) => s.explanation);
  const facts = bundle.evidence
    .slice(0, 6)
    .map((e) => `${e.field}: ${String(e.value)}`)
    .join('; ');
  return {
    cover: {
      kicker: 'Public procurement',
      headline: `${bundle.buyer.name} — review signals`,
      dek: 'Evidence summary (deterministic generation).',
    },
    theCase: `Review signals for ${bundle.buyer.name} involving ${supplier.displayNameEn}. ${facts}`,
    followTheMoney: facts || 'Public data under review.',
    theConnections: `Buyer → supplier relationship (${supplier.displayNameEn}).`,
    timeline: 'Timeline derived from the public data.',
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
      ...(e.benchmark !== undefined ? { benchmark: e.benchmark } : {}),
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
export async function publishInvestigations(
  args: PublishArgs,
): Promise<PublishResult> {
  let investigations = 0;
  let skipped = 0;
  let client: ReturnType<typeof createClaudeClient> | null = null;

  for (const bundle of args.bundles) {
    const hash = evidenceHash(bundle.signals);
    const existing = await getByCaseKey(bundle.caseKey);
    if (existing?.evidenceHash === hash) {
      skipped += 1;
      continue;
    }

    const supplierId = bundle.entities.supplierIds[0];
    const supplierEntity: Pick<Entity, '_id' | 'name' | 'entityType'> =
      (supplierId !== undefined
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
    let llmScenePlan: Record<
      string,
      { sceneId: string; params: Record<string, unknown> }
    >;
    if (!usedFallback && story !== null) {
      storyEs = story.es;
      storyEn = story.en;
      llmScenePlan = story.scenePlan;
    } else {
      storyEs = buildEvidenceOnlySummaryEs(bundle, anon);
      storyEn = buildEvidenceOnlySummaryEn(bundle, anon);
      // Empty llmScenePlan → resolveScenePlan derives every chapter from
      // evidence (source:'fallback'), so all 7 chapters are still present.
      llmScenePlan = {};
    }

    const totalValue = bundleTotalValue(bundle);
    const sceneSignals = toSceneSignals(bundle);
    const sceneEvidence: SceneEvidenceItem[] = bundle.evidence.map((e) => ({
      field: e.field,
      value: e.value,
      ...(e.comparison !== undefined ? { comparison: e.comparison } : {}),
      ...(e.benchmark !== undefined ? { benchmark: e.benchmark } : {}),
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

    const resolvedScenePlan = resolveScenePlan(
      bundle.firedRuleIds,
      llmScenePlan,
      sceneSignals,
      sceneEvidence,
      sceneInvestigation,
    );

    const version = existing ? existing.version + 1 : 1;
    const doc: Investigation = {
      _id: bundle.caseKey,
      buyer: bundle.buyer,
      supplier: anon,
      signalFamily: bundle.family,
      timeWindow: bundle.scope,
      reviewPriority: priority,
      ruleIds: bundle.firedRuleIds,
      signalIds: bundle.signals.map((s) => s._id),
      totalValue,
      currency: 'GTQ',
      es: storyEs,
      en: storyEn,
      scenePlan: resolvedScenePlan,
      evidence: bundle.evidence,
      evidenceHash: hash,
      version,
      status: 'published',
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const parsed = InvestigationSchema.parse(doc);
    await upsertInvestigationGuarded(parsed, existing?.evidenceHash);
    investigations += 1;
  }

  const edition = buildEdition(
    args.runId,
    new Date().toISOString(),
    args.bundles,
  );
  await insertEdition(edition);
  await upsertDashboardStats(await recomputeDashboardStats());

  return { investigations, skipped, editionId: edition._id };
}
