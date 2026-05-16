import type { SceneDescriptor } from '../types.js';

// Core 7 (Phase 0)
import { coverHeadline } from './coverHeadline.js';
import { caseStatement } from './caseStatement.js';
import { moneyFlowStreams } from './moneyFlowStreams.js';
import { concentrationFan } from './concentrationFan.js';
import { evidenceLedger } from './evidenceLedger.js';
import { awardTimeline } from './awardTimeline.js';
import { closingStatement } from './closingStatement.js';

// Variants (Phase 4 — authored, tagged not gated)
import { caseSplit } from './caseSplit.js';
import { priceBars } from './priceBars.js';
import { thresholdLadder } from './thresholdLadder.js';
import { splittingCluster } from './splittingCluster.js';
import { repeatBidders } from './repeatBidders.js';
import { evidenceCompare } from './evidenceCompare.js';
import { gapSpotlight } from './gapSpotlight.js';
import { regionMap } from './regionMap.js';

export const CORE_SCENE_IDS = [
  'CoverHeadline',
  'CaseStatement',
  'MoneyFlowStreams',
  'ConcentrationFan',
  'EvidenceLedger',
  'AwardTimeline',
  'ClosingStatement',
] as const;

export const VARIANT_SCENE_IDS = [
  'CaseSplit',
  'PriceBars',
  'ThresholdLadder',
  'SplittingCluster',
  'RepeatBidders',
  'EvidenceCompare',
  'GapSpotlight',
  'RegionMap',
] as const;

export const SCENES: Record<string, SceneDescriptor> = {
  CoverHeadline: coverHeadline,
  CaseStatement: caseStatement,
  MoneyFlowStreams: moneyFlowStreams,
  ConcentrationFan: concentrationFan,
  EvidenceLedger: evidenceLedger,
  AwardTimeline: awardTimeline,
  ClosingStatement: closingStatement,
  CaseSplit: caseSplit,
  PriceBars: priceBars,
  ThresholdLadder: thresholdLadder,
  SplittingCluster: splittingCluster,
  RepeatBidders: repeatBidders,
  EvidenceCompare: evidenceCompare,
  GapSpotlight: gapSpotlight,
  RegionMap: regionMap,
};
