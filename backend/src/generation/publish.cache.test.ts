import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Signal } from '../schema/index.js';
import type { CaseBundle } from './rank.js';
import type { ClaudeStoryRaw } from './claude.js';
import type { GuardedStoryResult } from './guardrails.js';

// publishInvestigations reaches into Mongo (getByCaseKey/upsert/editions/
// dashboardStats) and resolves the digest config via loadConfig (throws
// without env). Mock the leaf I/O + config so the digest / scene-plan /
// InvestigationSchema.parse logic runs for real, but the test stays hermetic.
// Same module-level vi.mock idiom as handlers/investigations.test.ts.
vi.mock('../config/env.js', () => ({
  loadConfig: () => ({
    EVIDENCE_SAMPLE_PER_RULE: 6,
    MAX_REPRESENTATIVE_EVIDENCE: 60,
    MAX_PERSISTED_EVIDENCE: 300,
    MAX_SCENE_SIGNALS_PER_RULE: 8,
    PUBLISH_ARTIFACTS: false,
  }),
}));

const getByCaseKeyMock = vi.fn();
const upsertInvestigationGuardedMock = vi.fn();
vi.mock('../repositories/investigations.js', () => ({
  getByCaseKey: (...a: unknown[]) => getByCaseKeyMock(...a),
  upsertInvestigationGuarded: (...a: unknown[]) => upsertInvestigationGuardedMock(...a),
}));

vi.mock('../repositories/editions.js', () => ({
  insertEdition: vi.fn(async () => undefined),
}));
vi.mock('../repositories/dashboard-stats.js', () => ({
  upsertDashboardStats: vi.fn(async () => undefined),
}));

// buildEdition / recomputeDashboardStats run heavy Mongo aggregations; the
// cache decision under test is per-bundle and orthogonal to the post-loop
// edition recompute, so stub them with schema-shaped returns.
vi.mock('./editions.js', () => ({
  // Arity mirrors the real buildEdition(runId, publishedAt, bundles) so a
  // future signature change isn't silently hidden by the stub.
  buildEdition: (runId: string, _publishedAt: string, _bundles: CaseBundle[]) => ({
    _id: runId,
    publishedAt: '2026-02-15T00:00:00Z',
    leadCaseKey: '',
    highlightCaseKeys: [],
    stats: { count: 0, totalValueFlagged: 0, byFamily: { F1: 0, F2: 0, F3: 0, F4: 0 } },
  }),
  recomputeDashboardStats: async () => ({
    _id: 'current',
    computedAt: '2026-02-15T00:00:00Z',
    counters: { records: 0, valueAnalyzed: 0, entities: 0, monthsCovered: 0, investigations: 0 },
    methodBreakdown: {},
    byFamily: { F1: 0, F2: 0, F3: 0, F4: 0 },
    priorityDist: { high: 0, medium: 0, low: 0 },
    trend: [],
    topBuyersByFlaggedValue: [],
  }),
}));

const generateStoryGuardedMock = vi.fn();
vi.mock('./guardrails.js', () => ({
  generateStoryGuarded: (...a: unknown[]) => generateStoryGuardedMock(...a),
}));

// Lazy Claude client — built on the cache-miss path AND on a cache hit only
// when there are Zod failures to repair (so broken-Zod scenes still get
// LLM-repaired). `repairScenes` is a module-level spy so a cache-hit test
// can assert it ran.
const repairScenesMock = vi.fn(
  async (..._a: unknown[]): Promise<Record<string, unknown>> => ({}),
);
const createClaudeClientMock = vi.fn(() => ({
  generateStory: vi.fn(),
  repairScenes: (...a: unknown[]) => repairScenesMock(...a),
}));
vi.mock('./claude.js', () => ({
  createClaudeClient: () => createClaudeClientMock(),
}));

vi.mock('../obs/publish-artifact.js', () => ({
  writePublishArtifact: vi.fn(async () => undefined),
}));

import { publishInvestigations } from './publish.js';

function sig(over: Partial<Signal> = {}): Signal {
  return {
    _id: over._id ?? 'sig-0001',
    ocid: over.ocid ?? 'ocds-1',
    caseKey: over.caseKey ?? 'CK1',
    rule_id: over.rule_id ?? 'single_bidder',
    family: over.family ?? 'F2',
    severity: over.severity ?? 'high',
    confidence: over.confidence ?? 0.6,
    primaryEntityId: 'GT-NIT:buyer',
    secondaryEntityIds: ['GT-NIT:sup'],
    timeWindow: 'scope:2026-01..2026-01',
    title: 't',
    explanation: 'Único oferente en la adjudicación.',
    story_angle: 'a',
    evidence: over.evidence ?? [{ field: 'awards[].value.amount', value: 650000 }],
  };
}

function bundle(): CaseBundle {
  const signals = [sig()];
  return {
    caseKey: 'CK1',
    buyer: { id: 'GT-NIT:buyer', name: 'Ministerio X' },
    family: 'F2',
    scope: 'scope:2026-01..2026-01',
    signals,
    evidence: signals.flatMap((s) => s.evidence),
    entities: { supplierIds: ['GT-NIT:sup'] },
    firedRuleIds: ['single_bidder'],
    isLead: false,
  };
}

function story(): ClaudeStoryRaw {
  return {
    es: {
      cover: { kicker: 'k', headline: 'LLM headline ES', dek: 'd' },
      elCaso: 'El caso describe 650000 en adjudicaciones.',
      sigueElDinero: 's',
      lasConexiones: 'c',
      cronologia: 't',
      cierre: { queSignificaYQueNo: 'q', caveat: 'caveat' },
      keyFindings: ['Único oferente'],
    },
    en: {
      cover: { kicker: 'k', headline: 'LLM headline EN', dek: 'd' },
      theCase: 'The case shows 650000 in awards.',
      followTheMoney: 's',
      theConnections: 'c',
      timeline: 't',
      closing: { whatItMeans: 'w', caveat: 'caveat' },
      keyFindings: ['Single bidder'],
    },
    podcast: {
      es: { script: 'guion es', cuePoints: [] },
      en: { script: 'script en', cuePoints: [] },
    },
    scenePlan: {},
  };
}

const baseArgs = () => ({
  runId: 'run-1',
  scope: 'scope:2026-01..2026-01',
  bundles: [bundle()],
  entityMap: new Map(),
});

describe('publishInvestigations — per-run story cache', () => {
  beforeEach(() => {
    getByCaseKeyMock.mockReset();
    getByCaseKeyMock.mockResolvedValue(null); // new case → not skipped
    upsertInvestigationGuardedMock.mockReset();
    upsertInvestigationGuardedMock.mockResolvedValue(undefined);
    generateStoryGuardedMock.mockReset();
    createClaudeClientMock.mockClear();
    repairScenesMock.mockClear();
    repairScenesMock.mockResolvedValue({});
  });

  it('(a) cache hit: generateStoryGuarded NOT called, cached story used', async () => {
    const cachedStory = story();
    const storyCache = new Map<string, GuardedStoryResult>([
      ['CK1', { story: cachedStory, usedFallback: false }],
    ]);
    const r = await publishInvestigations({ ...baseArgs(), storyCache });

    expect(generateStoryGuardedMock).not.toHaveBeenCalled(); // cache hit → no regen
    // Cached story has scenePlan:{} → zero Zod failures → the repair branch is
    // never entered, so the lazy Claude client is NOT constructed: the
    // "no Claude client unless a Claude call happens" invariant holds even on
    // a real-LLM cache hit.
    expect(createClaudeClientMock).not.toHaveBeenCalled();
    expect(repairScenesMock).not.toHaveBeenCalled();
    expect(r.investigations).toBe(1);
    const written = upsertInvestigationGuardedMock.mock.calls[0]![0] as {
      es: { cover: { headline: string } };
    };
    expect(written.es.cover.headline).toBe('LLM headline ES'); // cached story, not digest
  });

  it('(a2) cache hit with broken-Zod scene: client IS built and repairScenes runs', async () => {
    // A cached real LLM story whose `cover` chapter has a VALID sceneId
    // (CoverHeadline — the only `cover` scene, always shortlisted) but params
    // missing required fields (kicker/dek/bgVariant/intro/heroStat). Rule 6 in
    // validateScenePlan fails → source:'fallback' with a valid sceneId+chapter,
    // so collectSceneZodFailures returns a non-empty array and repair must run.
    // Without the Finding-1 fix `client` stays null on a cache hit and this
    // whole block is dead → repairScenes is never called.
    const brokenStory = story();
    brokenStory.scenePlan = {
      cover: { sceneId: 'CoverHeadline', params: { headline: 'broken' } },
    };
    const storyCache = new Map<string, GuardedStoryResult>([
      ['CK1', { story: brokenStory, usedFallback: false }],
    ]);
    const r = await publishInvestigations({ ...baseArgs(), storyCache });

    expect(generateStoryGuardedMock).not.toHaveBeenCalled(); // still a cache hit
    expect(createClaudeClientMock).toHaveBeenCalledTimes(1); // built FOR REPAIR
    expect(repairScenesMock).toHaveBeenCalledTimes(1);
    const repairArg = repairScenesMock.mock.calls[0]![0] as {
      caseKey: string;
      failures: { chapter: string; sceneId: string }[];
    };
    expect(repairArg.caseKey).toBe('CK1');
    expect(repairArg.failures.map((f) => f.chapter)).toContain('cover');
    expect(repairArg.failures.find((f) => f.chapter === 'cover')!.sceneId).toBe('CoverHeadline');
    expect(r.investigations).toBe(1);
  });

  it('(b) cache miss: generateStoryGuarded IS called (legacy CLI path unchanged)', async () => {
    generateStoryGuardedMock.mockResolvedValue({ story: story(), usedFallback: false });
    // No storyCache at all — the standalone publish CLI path.
    const r = await publishInvestigations(baseArgs());

    expect(generateStoryGuardedMock).toHaveBeenCalledTimes(1);
    expect(createClaudeClientMock).toHaveBeenCalledTimes(1);
    expect(r.investigations).toBe(1);
  });

  it('(b2) cache present but MISSING this caseKey: still generates', async () => {
    generateStoryGuardedMock.mockResolvedValue({ story: story(), usedFallback: false });
    const storyCache = new Map<string, GuardedStoryResult>([
      ['OTHER-CASE', { story: story(), usedFallback: false }],
    ]);
    await publishInvestigations({ ...baseArgs(), storyCache });

    expect(generateStoryGuardedMock).toHaveBeenCalledTimes(1);
  });

  it('(c) cached usedFallback:true → deterministic digest doc, NOT the LLM story', async () => {
    // A cached fallback entry MUST drive the evidence-only summary branch so the
    // article matches the (skipped) audio decision exactly.
    const storyCache = new Map<string, GuardedStoryResult>([
      ['CK1', { story: null, usedFallback: true }],
    ]);
    const r = await publishInvestigations({ ...baseArgs(), storyCache });

    expect(generateStoryGuardedMock).not.toHaveBeenCalled();
    expect(r.investigations).toBe(1);
    const written = upsertInvestigationGuardedMock.mock.calls[0]![0] as {
      es: { cover: { headline: string; dek: string } };
    };
    // buildEvidenceOnlySummaryEs headline/dek — deterministic, digest-derived.
    expect(written.es.cover.headline).toContain('Ministerio X');
    expect(written.es.cover.dek).toContain('determinista');
  });

  it('evidenceHash skip stays first: cache is NOT consulted for skipped cases', async () => {
    getByCaseKeyMock.mockResolvedValue({
      version: 3,
      // Must equal evidenceHash(bundle.signals) for the skip to trigger.
      evidenceHash: (await import('../identity/index.js')).evidenceHash(bundle().signals),
    });
    const storyCache = new Map<string, GuardedStoryResult>([
      ['CK1', { story: story(), usedFallback: false }],
    ]);
    const r = await publishInvestigations({ ...baseArgs(), storyCache });

    expect(r.skipped).toBe(1);
    expect(r.investigations).toBe(0);
    expect(generateStoryGuardedMock).not.toHaveBeenCalled();
    expect(upsertInvestigationGuardedMock).not.toHaveBeenCalled();
  });
});
