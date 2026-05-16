import { describe, expect, it } from 'vitest';
import {
  ApiContractError,
  EditionDTOSchema,
  FiltersDTOSchema,
  InvestigationFullSchema,
  InvestigationListResponseSchema,
  StatsDTOSchema,
} from './schemas';

const validListItem = {
  caseKey: 'GT-2024-001',
  buyer: { id: 'GT-NIT:4132726', name: 'Ministerio de Salud' },
  supplier: { displayNameEs: 'Proveedor A', displayNameEn: 'Supplier A', isIndividual: false, id: 's1' },
  signalFamily: 'F4',
  reviewPriority: 'high' as const,
  totalValue: 3200000,
  currency: 'GTQ',
  timeWindow: '2023-2024',
  headline: { kicker: 'EL CASO', headline: 'Titular', dek: 'Bajada' },
};

const validListResponse = {
  items: [validListItem],
  page: 1,
  pageSize: 20,
  total: 1,
};

describe('InvestigationListResponseSchema', () => {
  it('parses a valid paged envelope', () => {
    const parsed = InvestigationListResponseSchema.parse(validListResponse);
    expect(parsed.items[0]?.caseKey).toBe('GT-2024-001');
    expect(parsed.total).toBe(1);
  });

  it('rejects a bare array (envelope is required, not array)', () => {
    expect(InvestigationListResponseSchema.safeParse([validListItem]).success).toBe(false);
  });

  it('rejects an invalid reviewPriority enum', () => {
    const bad = { ...validListResponse, items: [{ ...validListItem, reviewPriority: 'urgent' }] };
    expect(InvestigationListResponseSchema.safeParse(bad).success).toBe(false);
  });
});

describe('InvestigationFullSchema', () => {
  it('accepts an s3:// audio URI (NOT .url())', () => {
    const full = {
      ...validListItem,
      ruleIds: ['18'],
      story: { elCaso: 'x' },
      scenePlan: { cover: { sceneId: 'CoverHeadline' } },
      evidence: [{ field: 'amount', value: 1 }],
      audio: 's3://bucket/audio/es/GT-2024-001.mp3',
      podcastCuePoints: [{ chapter: 'cover', t: 0 }],
      updatedAt: '2026-05-16T00:00:00Z',
    };
    expect(InvestigationFullSchema.parse(full).audio).toBe(
      's3://bucket/audio/es/GT-2024-001.mp3',
    );
  });

  it('allows audio to be omitted', () => {
    const full = {
      ...validListItem,
      ruleIds: [],
      story: {},
      scenePlan: {},
      evidence: [],
      updatedAt: '2026-05-16T00:00:00Z',
    };
    expect(InvestigationFullSchema.parse(full).audio).toBeUndefined();
  });
});

describe('StatsDTOSchema', () => {
  it('rejects malformed stats (missing counters)', () => {
    expect(StatsDTOSchema.safeParse({ computedAt: 'now' }).success).toBe(false);
  });
});

describe('EditionDTOSchema', () => {
  it('parses a valid recorded sample', () => {
    const parsed = EditionDTOSchema.parse({
      id: 'ed-1',
      leadCaseKey: 'GT-2024-001',
      highlights: [],
      stats: {},
      publishedAt: '2026-05-16T00:00:00Z',
    });
    expect(parsed.id).toBe('ed-1');
    expect(parsed.leadCaseKey).toBe('GT-2024-001');
  });
});

describe('FiltersDTOSchema', () => {
  it('parses a valid recorded sample', () => {
    const parsed = FiltersDTOSchema.parse({
      families: ['F1'],
      priorities: ['high'],
      buyers: [{ id: 'b1', name: 'Min Salud' }],
      valueBounds: { min: 0, max: 1e7 },
    });
    expect(parsed.buyers[0]?.name).toBe('Min Salud');
    expect(parsed.valueBounds.max).toBe(1e7);
  });
});

describe('ApiContractError', () => {
  it('carries endpoint + zod issues and a readable message', () => {
    const result = StatsDTOSchema.safeParse({ computedAt: 1 });
    expect(result.success).toBe(false);
    if (result.success) return;
    const err = new ApiContractError('/stats', result.error.issues);
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('ApiContractError');
    expect(err.endpoint).toBe('/stats');
    expect(err.issues.length).toBeGreaterThan(0);
    expect(err.message).toContain('/stats');
  });
});
