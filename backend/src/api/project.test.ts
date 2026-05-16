import { describe, it, expect } from 'vitest';
import type { DashboardStats, Edition, Investigation } from '../schema/index.js';
import {
  validInvestigation,
  validInvestigationWithAudio,
} from '../schema/investigations.fixtures.js';
import {
  assertNoLeak,
  projectEdition,
  projectFull,
  projectListItem,
  projectStats,
  projectSupplier,
} from './project.js';

const companyDoc: Investigation = validInvestigationWithAudio;
const individualDoc: Investigation = {
  ...validInvestigation,
  supplier: {
    id: 'person-123',
    displayNameEs: 'Juan Pérez',
    displayNameEn: 'Juan Perez',
    isIndividual: true,
  },
};

describe('projectSupplier', () => {
  it('drops id for an individual supplier', () => {
    const out = projectSupplier(individualDoc.supplier);
    expect(out.isIndividual).toBe(true);
    expect('id' in out).toBe(false);
    expect(out.id).toBeUndefined();
  });

  it('keeps id for a company supplier', () => {
    const out = projectSupplier(companyDoc.supplier);
    expect(out.isIndividual).toBe(false);
    expect(out.id).toBe(companyDoc.supplier.id);
  });
});

describe('projectFull — no internal leak', () => {
  it('individual: no signalIds/evidenceHash/version/status and supplier.id ABSENT', () => {
    const dto = projectFull(individualDoc, 'es');
    const keys = Object.keys(dto);
    expect(keys).not.toContain('signalIds');
    expect(keys).not.toContain('evidenceHash');
    expect(keys).not.toContain('version');
    expect(keys).not.toContain('status');
    expect('id' in dto.supplier).toBe(false);
    expect(dto.supplier.id).toBeUndefined();
    expect(dto.caseKey).toBe(individualDoc._id);
  });

  it('company: supplier.id IS present', () => {
    const dto = projectFull(companyDoc, 'es');
    expect(dto.supplier.id).toBe(companyDoc.supplier.id);
  });

  it('lang=en selects EN story fields', () => {
    const dto = projectFull(companyDoc, 'en');
    expect(dto.story['theCase']).toBe(companyDoc.en.theCase);
    expect(dto.headline.headline).toBe(companyDoc.en.cover.headline);
    expect(dto.audio).toBe(companyDoc.audio?.en);
  });

  it('lang=es selects ES story fields', () => {
    const dto = projectFull(companyDoc, 'es');
    expect(dto.story['elCaso']).toBe(companyDoc.es.elCaso);
    expect(dto.headline.headline).toBe(companyDoc.es.cover.headline);
    expect(dto.audio).toBe(companyDoc.audio?.es);
  });

  it('omits audio when the doc has none', () => {
    const dto = projectFull(individualDoc, 'es');
    expect('audio' in dto).toBe(false);
  });
});

describe('projectListItem', () => {
  it('maps _id to caseKey and resolves the lang cover', () => {
    const item = projectListItem(companyDoc, 'en');
    expect(item.caseKey).toBe(companyDoc._id);
    expect(item.headline.kicker).toBe(companyDoc.en.cover.kicker);
    expect(item.timeWindow).toBe(companyDoc.timeWindow);
  });
});

describe('assertNoLeak', () => {
  it('throws when an object carries signalIds', () => {
    expect(() => assertNoLeak({ caseKey: 'x', signalIds: ['s1'] })).toThrow(
      /signalIds/,
    );
  });

  it('throws when an individual supplier exposes id', () => {
    expect(() =>
      assertNoLeak({ supplier: { isIndividual: true, id: 'p1' } }),
    ).toThrow(/individual/);
  });

  it('passes a clean DTO', () => {
    expect(() =>
      assertNoLeak({ caseKey: 'x', supplier: { isIndividual: false, id: 'c1' } }),
    ).not.toThrow();
  });
});

describe('projectStats', () => {
  it('returns a shape with no _id', () => {
    const stats: DashboardStats = {
      _id: 'current',
      computedAt: '2026-05-16T00:00:00Z',
      counters: {
        records: 10,
        valueAnalyzed: 1000,
        entities: 5,
        monthsCovered: 12,
        investigations: 3,
      },
      methodBreakdown: { open: 0.5 },
      byFamily: { F1: 1, F2: 1, F3: 1, F4: 0 },
      priorityDist: { high: 1, medium: 1, low: 1 },
      trend: [{ month: '2026-05', flagged: 3, value: 1000 }],
      topBuyersByFlaggedValue: [{ id: 'b1', name: 'Buyer', value: 500 }],
    };
    const dto = projectStats(stats);
    expect('_id' in dto).toBe(false);
    expect(dto.counters.records).toBe(10);
  });
});

describe('projectEdition', () => {
  it('maps _id to id and drops _id', () => {
    const edition: Edition = {
      _id: 'edition-2026-05',
      publishedAt: '2026-05-16T00:00:00Z',
      leadCaseKey: 'case-1',
      highlightCaseKeys: ['case-1', 'case-2'],
      stats: {
        count: 2,
        totalValueFlagged: 1000,
        byFamily: { F1: 1, F2: 1, F3: 0, F4: 0 },
      },
    };
    const dto = projectEdition(edition);
    expect(dto.id).toBe('edition-2026-05');
    expect('_id' in dto).toBe(false);
    expect(dto.leadCaseKey).toBe('case-1');
  });
});
