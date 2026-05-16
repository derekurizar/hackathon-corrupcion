import { describe, it, expect } from 'vitest';
import {
  shortlist,
  defaultScene,
  ruleFamily,
  ruleOrdinalsFromSignals,
  RULE_CATALOG,
} from './shortlist.js';
import type { Chapter, SceneSignal } from './types.js';

describe('ruleFamily', () => {
  it('maps ordinal bands to families', () => {
    expect(ruleFamily(1)).toBe('F1');
    expect(ruleFamily(6)).toBe('F1');
    expect(ruleFamily(7)).toBe('F2');
    expect(ruleFamily(12)).toBe('F2');
    expect(ruleFamily(13)).toBe('F3');
    expect(ruleFamily(17)).toBe('F3');
    expect(ruleFamily(18)).toBe('F4');
    expect(ruleFamily(23)).toBe('F4');
  });
  it('returns undefined for out-of-range ordinals', () => {
    expect(ruleFamily(0)).toBeUndefined();
    expect(ruleFamily(24)).toBeUndefined();
  });
  it('catalog family agrees with the band map for every ordinal', () => {
    for (const r of RULE_CATALOG) {
      expect(ruleFamily(r.ordinal)).toBe(r.family);
    }
  });
});

describe('RULE_CATALOG', () => {
  it('has 23 unique ordinals 1..23 and unique ids', () => {
    expect(RULE_CATALOG).toHaveLength(23);
    expect(RULE_CATALOG.map((r) => r.ordinal)).toEqual(
      Array.from({ length: 23 }, (_, i) => i + 1),
    );
    expect(new Set(RULE_CATALOG.map((r) => r.id)).size).toBe(23);
  });
});

describe('ruleOrdinalsFromSignals', () => {
  const mk = (rule_id: string): SceneSignal => ({
    rule_id,
    ocid: 'ocds-x',
    family: 'F1',
    severity: 'medium',
    evidence: [],
  });

  it('maps known rule_id strings to ordinals', () => {
    const ords = ruleOrdinalsFromSignals([
      mk('single_bidder'), // 1
      mk('contract_splitting'), // 18
      mk('repeat_winner_same_competitors'), // 10
    ]);
    expect(ords.sort((a, b) => a - b)).toEqual([1, 10, 18]);
  });

  it('dedupes repeated rule_ids and drops unknown ones', () => {
    const ords = ruleOrdinalsFromSignals([
      mk('single_bidder'),
      mk('single_bidder'),
      mk('not_a_real_rule'),
    ]);
    expect(ords).toEqual([1]);
  });

  it('returns [] for an empty signal list', () => {
    expect(ruleOrdinalsFromSignals([])).toEqual([]);
  });
});

describe('shortlist — fixed chapters', () => {
  it('cover is always [CoverHeadline]', () => {
    expect(shortlist('cover', [])).toEqual(['CoverHeadline']);
    expect(shortlist('cover', [1, 7, 13, 18])).toEqual(['CoverHeadline']);
  });
  it('cierre is always [ClosingStatement]', () => {
    expect(shortlist('cierre', [])).toEqual(['ClosingStatement']);
    expect(shortlist('cierre', [1, 7, 13, 18])).toEqual(['ClosingStatement']);
  });
});

describe('shortlist — elCaso (CaseSplit always)', () => {
  it('always [CaseStatement, CaseSplit]', () => {
    expect(shortlist('elCaso', [])).toEqual(['CaseStatement', 'CaseSplit']);
    expect(shortlist('elCaso', [1, 13])).toEqual(['CaseStatement', 'CaseSplit']);
  });
});

describe('shortlist — sigueElDinero', () => {
  it('default only with no rules', () => {
    expect(shortlist('sigueElDinero', [])).toEqual(['MoneyFlowStreams']);
  });
  it('adds PriceBars if rule 13 or 14 fired', () => {
    expect(shortlist('sigueElDinero', [13])).toEqual([
      'MoneyFlowStreams',
      'PriceBars',
    ]);
    expect(shortlist('sigueElDinero', [14])).toEqual([
      'MoneyFlowStreams',
      'PriceBars',
    ]);
  });
  it('adds ThresholdLadder if rule 15 or 18 fired', () => {
    expect(shortlist('sigueElDinero', [15])).toEqual([
      'MoneyFlowStreams',
      'ThresholdLadder',
    ]);
    expect(shortlist('sigueElDinero', [18])).toEqual([
      'MoneyFlowStreams',
      'ThresholdLadder',
    ]);
  });
  it('adds RegionMap only when hasRegion (stretch)', () => {
    expect(shortlist('sigueElDinero', [], { hasRegion: true })).toEqual([
      'MoneyFlowStreams',
      'RegionMap',
    ]);
    expect(shortlist('sigueElDinero', [], { hasRegion: false })).toEqual([
      'MoneyFlowStreams',
    ]);
  });
  it('combines all triggers in the documented order', () => {
    expect(
      shortlist('sigueElDinero', [13, 18], { hasRegion: true }),
    ).toEqual(['MoneyFlowStreams', 'PriceBars', 'ThresholdLadder', 'RegionMap']);
  });
});

describe('shortlist — lasConexiones', () => {
  it('default only with no rules', () => {
    expect(shortlist('lasConexiones', [])).toEqual(['ConcentrationFan']);
  });
  it('adds SplittingCluster if rule 18 fired', () => {
    expect(shortlist('lasConexiones', [18])).toEqual([
      'ConcentrationFan',
      'SplittingCluster',
    ]);
  });
  it('adds RepeatBidders if rule 10 fired', () => {
    expect(shortlist('lasConexiones', [10])).toEqual([
      'ConcentrationFan',
      'RepeatBidders',
    ]);
  });
  it('adds both in documented order', () => {
    expect(shortlist('lasConexiones', [10, 18])).toEqual([
      'ConcentrationFan',
      'SplittingCluster',
      'RepeatBidders',
    ]);
  });
});

describe('shortlist — evidencia', () => {
  it('default only without benchmark', () => {
    expect(shortlist('evidencia', [])).toEqual(['EvidenceLedger']);
  });
  it('adds EvidenceCompare if hasBenchmark', () => {
    expect(shortlist('evidencia', [], { hasBenchmark: true })).toEqual([
      'EvidenceLedger',
      'EvidenceCompare',
    ]);
  });
});

describe('shortlist — cronologia', () => {
  it('default only with no rules', () => {
    expect(shortlist('cronologia', [])).toEqual(['AwardTimeline']);
  });
  it('adds GapSpotlight if rule 20 or 21 fired', () => {
    expect(shortlist('cronologia', [20])).toEqual([
      'AwardTimeline',
      'GapSpotlight',
    ]);
    expect(shortlist('cronologia', [21])).toEqual([
      'AwardTimeline',
      'GapSpotlight',
    ]);
  });
});

describe('defaultScene', () => {
  const chapters: Chapter[] = [
    'cover',
    'elCaso',
    'sigueElDinero',
    'lasConexiones',
    'evidencia',
    'cronologia',
    'cierre',
  ];
  it('returns the first shortlist entry for each chapter', () => {
    const expected: Record<Chapter, string> = {
      cover: 'CoverHeadline',
      elCaso: 'CaseStatement',
      sigueElDinero: 'MoneyFlowStreams',
      lasConexiones: 'ConcentrationFan',
      evidencia: 'EvidenceLedger',
      cronologia: 'AwardTimeline',
      cierre: 'ClosingStatement',
    };
    for (const c of chapters) {
      expect(defaultScene(c)).toBe(expected[c]);
    }
  });
});
