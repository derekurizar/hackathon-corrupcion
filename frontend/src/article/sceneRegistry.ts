import { lazy } from 'react';
import type React from 'react';
import type { Chapter } from '@/_scene-contract';
import type { InvestigationFull } from '@/api/schemas';

/**
 * Every scene component receives the same prop contract. `params` is `unknown`
 * here — `ScenePicker` runs the synced Zod `safeParse` and hands each scene a
 * validated, hand-mirrored params interface.
 */
export type SceneComponentProps = {
  params: unknown;
  investigation: InvestigationFull;
  chapter: Chapter;
};

/**
 * Code-split scene catalog (idea/05 §perf — code-split scene components).
 * Keys are the `sceneId`s from the synced scene-contract.
 */
export const sceneRegistry: Record<
  string,
  React.LazyExoticComponent<React.ComponentType<SceneComponentProps>>
> = {
  CoverHeadline: lazy(() => import('./scenes/CoverHeadline')),
  CaseStatement: lazy(() => import('./scenes/CaseStatement')),
  MoneyFlowStreams: lazy(() => import('./scenes/MoneyFlowStreams')),
  ConcentrationFan: lazy(() => import('./scenes/ConcentrationFan')),
  EvidenceLedger: lazy(() => import('./scenes/EvidenceLedger')),
  AwardTimeline: lazy(() => import('./scenes/AwardTimeline')),
  ClosingStatement: lazy(() => import('./scenes/ClosingStatement')),
  // VARIANT_SCENE_IDS (Epic 11.5) — keys are the synced `sceneId`s.
  CaseSplit: lazy(() => import('./scenes/CaseSplit')),
  PriceBars: lazy(() => import('./scenes/PriceBars')),
  ThresholdLadder: lazy(() => import('./scenes/ThresholdLadder')),
  SplittingCluster: lazy(() => import('./scenes/SplittingCluster')),
  RepeatBidders: lazy(() => import('./scenes/RepeatBidders')),
  EvidenceCompare: lazy(() => import('./scenes/EvidenceCompare')),
  GapSpotlight: lazy(() => import('./scenes/GapSpotlight')),
  RegionMap: lazy(() => import('./scenes/RegionMap')),
};
