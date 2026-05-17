import { Suspense } from 'react';
import {
  SCENES,
  defaultScene,
  deriveFromEvidence,
} from '@/_scene-contract';
import type {
  Chapter,
  SceneEvidenceItem,
  SceneInvestigation,
} from '@/_scene-contract';
import type { InvestigationFull } from '@/api/schemas';
import { sceneRegistry } from './sceneRegistry';
import Loader from '@/ui/Loader';

type PlanEntry = { sceneId: string; params: unknown } | undefined;

type ScenePickerProps = {
  chapter: Chapter;
  planEntry: PlanEntry;
  investigation: InvestigationFull;
};

/**
 * Projects the transport-layer `InvestigationFull` onto the scene-contract's
 * `SceneInvestigation` shape (what `deriveFromEvidence` expects). `supplier.id`
 * is optional on the DTO (privacy: omitted for individuals) — coerce to `''`
 * so the view-type stays total without leaking a person's id.
 */
function toInvestigationView(inv: InvestigationFull): SceneInvestigation {
  return {
    buyer: { id: inv.buyer.id, name: inv.buyer.name },
    supplier: {
      id: inv.supplier.id ?? '',
      displayNameEs: inv.supplier.displayNameEs,
      displayNameEn: inv.supplier.displayNameEn,
      isIndividual: inv.supplier.isIndividual,
    },
    reviewPriority: inv.reviewPriority,
    totalValue: inv.totalValue,
    currency: inv.currency,
    // `investigation.evidence` is `unknown[]` on the DTO; `deriveFromEvidence`
    // runtime-guards every field access (see _scene-contract/derive.ts), so
    // this coercion is safe — documented per the contract.
    evidence: inv.evidence as SceneEvidenceItem[],
  };
}

function SceneFallback() {
  return <Loader labelKey="article.loading" className="min-h-[40vh]" />;
}

/**
 * Locked scene-resolution algorithm (idea/05 §validator). NEVER throws:
 *
 *  1. resolve component by `planEntry.sceneId`
 *  2. if found AND the synced schema `safeParse`s the params → render it
 *  3. otherwise render the chapter's guaranteed default scene with params
 *     built purely from evidence (`deriveFromEvidence`) — the article always
 *     renders.
 */
export function ScenePicker({
  chapter,
  planEntry,
  investigation,
}: ScenePickerProps) {
  const Comp = planEntry?.sceneId
    ? sceneRegistry[planEntry.sceneId]
    : undefined;
  const descriptor = planEntry?.sceneId
    ? SCENES[planEntry.sceneId]
    : undefined;

  if (Comp && descriptor) {
    const result = descriptor.schema.safeParse(planEntry?.params);
    if (result.success) {
      return (
        <Suspense fallback={<SceneFallback />}>
          <Comp
            params={result.data}
            investigation={investigation}
            chapter={chapter}
          />
        </Suspense>
      );
    }
  }

  // Fallback path: unknown sceneId / no component / params parse failure.
  const fbSceneId = defaultScene(chapter);
  const FbComp = sceneRegistry[fbSceneId];
  const fbParams = deriveFromEvidence(
    chapter,
    [],
    investigation.evidence as SceneEvidenceItem[],
    toInvestigationView(investigation),
  );

  if (!FbComp) {
    // Belt-and-braces: every chapter's default is in CORE_SCENE_IDS, so this
    // is unreachable — but never throw.
    return <SceneFallback />;
  }

  return (
    <Suspense fallback={<SceneFallback />}>
      <FbComp
        params={fbParams}
        investigation={investigation}
        chapter={chapter}
      />
    </Suspense>
  );
}
