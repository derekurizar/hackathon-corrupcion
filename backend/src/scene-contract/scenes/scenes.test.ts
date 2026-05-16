import { describe, it, expect } from 'vitest';
import { SCENES, CORE_SCENE_IDS, VARIANT_SCENE_IDS } from './index.js';
import { validCoverHeadline, invalidCoverHeadline } from './__fixtures__/coverHeadline.js';
import { validCaseStatement, invalidCaseStatement } from './__fixtures__/caseStatement.js';
import { validMoneyFlowStreams, invalidMoneyFlowStreams } from './__fixtures__/moneyFlowStreams.js';
import { validConcentrationFan, invalidConcentrationFan } from './__fixtures__/concentrationFan.js';
import { validEvidenceLedger, invalidEvidenceLedger } from './__fixtures__/evidenceLedger.js';
import { validAwardTimeline, invalidAwardTimeline } from './__fixtures__/awardTimeline.js';
import { validClosingStatement, invalidClosingStatement } from './__fixtures__/closingStatement.js';
import { validCaseSplit, invalidCaseSplit } from './__fixtures__/caseSplit.js';
import { validPriceBars, invalidPriceBars } from './__fixtures__/priceBars.js';
import { validThresholdLadder, invalidThresholdLadder } from './__fixtures__/thresholdLadder.js';
import { validSplittingCluster, invalidSplittingCluster } from './__fixtures__/splittingCluster.js';
import { validRepeatBidders, invalidRepeatBidders } from './__fixtures__/repeatBidders.js';
import { validEvidenceCompare, invalidEvidenceCompare } from './__fixtures__/evidenceCompare.js';
import { validGapSpotlight, invalidGapSpotlight } from './__fixtures__/gapSpotlight.js';
import { validRegionMap, invalidRegionMap } from './__fixtures__/regionMap.js';

const cases: { id: string; valid: unknown; invalid: unknown }[] = [
  { id: 'CoverHeadline', valid: validCoverHeadline, invalid: invalidCoverHeadline },
  { id: 'CaseStatement', valid: validCaseStatement, invalid: invalidCaseStatement },
  {
    id: 'MoneyFlowStreams',
    valid: validMoneyFlowStreams,
    invalid: invalidMoneyFlowStreams,
  },
  {
    id: 'ConcentrationFan',
    valid: validConcentrationFan,
    invalid: invalidConcentrationFan,
  },
  { id: 'EvidenceLedger', valid: validEvidenceLedger, invalid: invalidEvidenceLedger },
  { id: 'AwardTimeline', valid: validAwardTimeline, invalid: invalidAwardTimeline },
  {
    id: 'ClosingStatement',
    valid: validClosingStatement,
    invalid: invalidClosingStatement,
  },
  { id: 'CaseSplit', valid: validCaseSplit, invalid: invalidCaseSplit },
  { id: 'PriceBars', valid: validPriceBars, invalid: invalidPriceBars },
  {
    id: 'ThresholdLadder',
    valid: validThresholdLadder,
    invalid: invalidThresholdLadder,
  },
  {
    id: 'SplittingCluster',
    valid: validSplittingCluster,
    invalid: invalidSplittingCluster,
  },
  { id: 'RepeatBidders', valid: validRepeatBidders, invalid: invalidRepeatBidders },
  {
    id: 'EvidenceCompare',
    valid: validEvidenceCompare,
    invalid: invalidEvidenceCompare,
  },
  { id: 'GapSpotlight', valid: validGapSpotlight, invalid: invalidGapSpotlight },
  { id: 'RegionMap', valid: validRegionMap, invalid: invalidRegionMap },
];

describe('SCENES registry', () => {
  it('has every core + variant id registered', () => {
    for (const id of [...CORE_SCENE_IDS, ...VARIANT_SCENE_IDS]) {
      expect(SCENES[id], `missing scene ${id}`).toBeDefined();
      expect(SCENES[id]?.sceneId).toBe(id);
    }
  });

  it('each descriptor declares a chapter and kinds map', () => {
    for (const id of Object.keys(SCENES)) {
      const d = SCENES[id]!;
      expect(typeof d.chapter).toBe('string');
      expect(Object.keys(d.kinds).length).toBeGreaterThan(0);
    }
  });
});

describe.each(cases)('$id schema', ({ id, valid, invalid }) => {
  it('parses the valid fixture', () => {
    const d = SCENES[id]!;
    expect(() => d.schema.parse(valid)).not.toThrow();
  });

  it('rejects the invalid fixture', () => {
    const d = SCENES[id]!;
    expect(d.schema.safeParse(invalid).success).toBe(false);
  });
});
