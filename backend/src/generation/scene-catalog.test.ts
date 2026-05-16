import { describe, it, expect } from 'vitest';
import { SCENES } from '../scene-contract/index.js';
import { renderSceneCatalog, chapterShortlists } from './scene-catalog.js';

describe('renderSceneCatalog', () => {
  it('renders every scene descriptor (cannot silently drift)', () => {
    const cat = renderSceneCatalog();
    for (const id of Object.keys(SCENES)) expect(cat).toContain(id);
    for (const ch of [
      'cover',
      'elCaso',
      'sigueElDinero',
      'lasConexiones',
      'evidencia',
      'cronologia',
      'cierre',
    ]) {
      expect(cat).toContain(`[${ch}]`);
    }
    // Marks the chapter default and is deterministic.
    expect(cat).toContain('MoneyFlowStreams (default)');
    expect(renderSceneCatalog()).toBe(cat);
  });
});

describe('chapterShortlists', () => {
  it('no fired rules → each chapter is just its default, first = default', () => {
    const sl = chapterShortlists([], false);
    const get = (c: string): string[] => sl.find((x) => x.chapter === c)!.scenes;
    expect(get('cover')).toEqual(['CoverHeadline']);
    expect(get('sigueElDinero')).toEqual(['MoneyFlowStreams']);
    expect(get('cierre')).toEqual(['ClosingStatement']);
    // elCaso always offers CaseSplit too.
    expect(get('elCaso')).toEqual(['CaseStatement', 'CaseSplit']);
  });

  it('F3 price rule (13) unlocks PriceBars in sigueElDinero', () => {
    const sl = chapterShortlists(['price_outlier_vs_category'], false);
    const money = sl.find((x) => x.chapter === 'sigueElDinero')!.scenes;
    expect(money[0]).toBe('MoneyFlowStreams'); // default still first
    expect(money).toContain('PriceBars');
  });

  it('contract_splitting (18) unlocks ThresholdLadder + SplittingCluster', () => {
    const sl = chapterShortlists(['contract_splitting'], false);
    expect(sl.find((x) => x.chapter === 'sigueElDinero')!.scenes).toContain('ThresholdLadder');
    expect(sl.find((x) => x.chapter === 'lasConexiones')!.scenes).toContain('SplittingCluster');
  });

  it('hasBenchmark unlocks EvidenceCompare; unknown rule ids are dropped', () => {
    const withBench = chapterShortlists(['totally_unknown_rule'], true);
    expect(withBench.find((x) => x.chapter === 'evidencia')!.scenes).toEqual([
      'EvidenceLedger',
      'EvidenceCompare',
    ]);
    // unknown rule contributed no ordinal → other chapters stay default-only
    expect(withBench.find((x) => x.chapter === 'sigueElDinero')!.scenes).toEqual([
      'MoneyFlowStreams',
    ]);
  });

  it('is deterministic for identical input', () => {
    const a = chapterShortlists(['single_bidder', 'contract_splitting'], true);
    const b = chapterShortlists(['contract_splitting', 'single_bidder'], true);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
