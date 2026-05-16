import { describe, it, expect } from 'vitest';
import { EntitySchema } from './entities.js';
import { BenchmarkSchema } from './benchmarks.js';
import { SignalSchema } from './signals.js';
import { InvestigationSchema } from './investigations.js';
import { EditionSchema } from './editions.js';
import { DashboardStatsSchema } from './dashboard-stats.js';
import { PipelineRunSchema } from './pipeline-runs.js';
import { validEntity } from './entities.fixtures.js';
import { validBenchmark } from './benchmarks.fixtures.js';
import { validSignal } from './signals.fixtures.js';
import { validInvestigation, validInvestigationWithAudio } from './investigations.fixtures.js';
import { validEdition } from './editions.fixtures.js';
import { validDashboardStats } from './dashboard-stats.fixtures.js';
import { validPipelineRun } from './pipeline-runs.fixtures.js';

describe('EntitySchema', () => {
  it('parses a valid fixture', () => {
    expect(EntitySchema.parse(validEntity)._id).toBe('GT-NIT:1234567');
  });
  it('rejects an invalid kind', () => {
    const bad = { ...validEntity, kind: 'vendor' };
    expect(EntitySchema.safeParse(bad).success).toBe(false);
  });
});

describe('BenchmarkSchema', () => {
  it('parses a valid fixture', () => {
    const parsed = BenchmarkSchema.parse(validBenchmark);
    expect(parsed.categoryPrice['8110']?.median).toBe(50000);
  });
  it('rejects when nested countShare is a string', () => {
    const bad = {
      ...validBenchmark,
      buyerMethodMix: {
        'GT-NIT:4132726': { 'compra-directa': { valueShare: 0.7, countShare: 'high' } },
      },
    };
    expect(BenchmarkSchema.safeParse(bad).success).toBe(false);
  });
});

describe('SignalSchema', () => {
  it('parses a valid fixture with evidence array', () => {
    const parsed = SignalSchema.parse(validSignal);
    expect(parsed.evidence[0]?.field).toBe('bidCounts.count');
  });
  it('rejects an invalid family', () => {
    const bad = { ...validSignal, family: 'F5' };
    expect(SignalSchema.safeParse(bad).success).toBe(false);
  });
});

describe('InvestigationSchema', () => {
  it('parses a valid fixture (es + en story content)', () => {
    const parsed = InvestigationSchema.parse(validInvestigation);
    expect(parsed.es.elCaso).toBeTypeOf('string');
    expect(parsed.en.theCase).toBeTypeOf('string');
    expect(parsed.audio).toBeUndefined();
  });
  it('parses a valid fixture with optional audio + cue points', () => {
    const parsed = InvestigationSchema.parse(validInvestigationWithAudio);
    expect(parsed.audio?.es).toBe('s3://bucket/es.mp3');
    expect(parsed.podcastCuePoints?.en[0]?.chapter).toBe('The case');
  });
  it('rejects when es story is missing a required field', () => {
    const bad = {
      ...validInvestigation,
      es: { ...validInvestigation.es, elCaso: undefined },
    };
    expect(InvestigationSchema.safeParse(bad).success).toBe(false);
  });
  it('rejects an invalid scenePlan source', () => {
    const bad = {
      ...validInvestigation,
      scenePlan: {
        scene01: { sceneId: 'cover', params: {}, source: 'human' },
      },
    };
    expect(InvestigationSchema.safeParse(bad).success).toBe(false);
  });
});

describe('EditionSchema', () => {
  it('parses a valid fixture', () => {
    expect(EditionSchema.parse(validEdition).stats.byFamily.F2).toBe(5);
  });
  it('rejects when byFamily.F1 is a float', () => {
    const bad = {
      ...validEdition,
      stats: { ...validEdition.stats, byFamily: { F1: 1.5, F2: 5, F3: 2, F4: 1 } },
    };
    expect(EditionSchema.safeParse(bad).success).toBe(false);
  });
});

describe('DashboardStatsSchema', () => {
  it('parses a valid fixture', () => {
    expect(DashboardStatsSchema.parse(validDashboardStats)._id).toBe('current');
  });
  it('rejects when _id is not the literal "current"', () => {
    const bad = { ...validDashboardStats, _id: 'snapshot-2026-02' };
    expect(DashboardStatsSchema.safeParse(bad).success).toBe(false);
  });
});

describe('PipelineRunSchema', () => {
  it('parses a valid fixture', () => {
    const parsed = PipelineRunSchema.parse(validPipelineRun);
    expect(parsed.counts.recordsIngested).toBe(12000);
  });
  it('rejects when a toggle value is not boolean', () => {
    const bad = { ...validPipelineRun, toggles: { ingest: 'yes' } };
    expect(PipelineRunSchema.safeParse(bad).success).toBe(false);
  });
});
