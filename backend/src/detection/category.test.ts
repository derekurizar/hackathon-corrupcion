import { describe, it, expect } from 'vitest';
import { awardCategory, resolveCategoryLevel } from './category.js';
import { defaultRuleConfig } from './config.js';
import { makeRelease } from './__fixtures__/release.js';
import type { Benchmark } from '../schema/benchmarks.js';

const item = (id: string) => ({
  classificationId: id,
  scheme: 'UNSPSC',
  description: 'x',
  quantity: 1,
  unitName: 'Unidad',
});

describe('awardCategory', () => {
  it('most-frequent 4-digit family wins', () => {
    const r = makeRelease({
      tender: {
        ...makeRelease().tender,
        items: [item('81101513'), item('81101599'), item('43221724')],
        itemFamilies: ['8110', '4322'],
      },
    });
    expect(awardCategory(r)).toBe('8110'); // 2x vs 1x
  });

  it('tie-break = first family encountered', () => {
    const r = makeRelease({
      tender: {
        ...makeRelease().tender,
        items: [item('43221724'), item('81101513')],
        itemFamilies: ['4322', '8110'],
      },
    });
    expect(awardCategory(r)).toBe('4322');
  });

  it('skips classification ids shorter than 4 chars', () => {
    const r = makeRelease({
      tender: {
        ...makeRelease().tender,
        items: [item('81'), item('72141003')],
        itemFamilies: ['7214'],
      },
    });
    expect(awardCategory(r)).toBe('7214');
  });

  it('falls back to itemFamilies when items are unusable', () => {
    const r = makeRelease({
      tender: {
        ...makeRelease().tender,
        items: [item('xx')],
        itemFamilies: ['9999'],
      },
    });
    expect(awardCategory(r)).toBe('9999');
  });

  it('returns "" when no family derivable', () => {
    const r = makeRelease({
      tender: { ...makeRelease().tender, items: [], itemFamilies: [] },
    });
    expect(awardCategory(r)).toBe('');
  });
});

describe('resolveCategoryLevel fallback ladder', () => {
  const cfg = defaultRuleConfig; // CATEGORY_MIN_SAMPLE = 8
  const cp = (
    count: number,
    level: string,
  ): Benchmark['categoryPrice'][string] => ({
    median: 100,
    p25: 50,
    p75: 150,
    count,
    level,
    tendererCountP25: 1,
  });

  it('uses the 4-digit family when its count >= CATEGORY_MIN_SAMPLE', () => {
    const r = resolveCategoryLevel('8110', 'goods', { '8110': cp(10, 'family') }, cfg);
    expect(r?.key).toBe('8110');
    expect(r?.stats.level).toBe('family');
  });

  it('falls to the 2-digit segment when the family sample is too small', () => {
    const r = resolveCategoryLevel(
      '8110',
      'goods',
      { '8110': cp(3, 'family'), '81': cp(40, 'segment') },
      cfg,
    );
    expect(r?.key).toBe('81');
    expect(r?.stats.level).toBe('segment');
  });

  it('falls to mainProcurementCategory when family + segment are too small', () => {
    const r = resolveCategoryLevel(
      '8110',
      'goods',
      { '8110': cp(2, 'family'), '81': cp(4, 'segment'), goods: cp(900, 'mainCategory') },
      cfg,
    );
    expect(r?.key).toBe('goods');
    expect(r?.stats.level).toBe('mainCategory');
  });

  it('returns undefined when no level has a sufficient sample', () => {
    const r = resolveCategoryLevel(
      '8110',
      'goods',
      { '8110': cp(2, 'family'), goods: cp(3, 'mainCategory') },
      cfg,
    );
    expect(r).toBeUndefined();
  });
});
