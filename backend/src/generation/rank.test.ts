import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Signal } from '../schema/index.js';
import type { Entity } from '../schema/index.js';

let scopeSignals: Signal[] = [];
let allEntities: Entity[] = [];
let maxPerRun = 20;

vi.mock('../repositories/signals.js', () => ({
  getSignalsByScope: async () => scopeSignals,
}));
vi.mock('../repositories/entities.js', () => ({
  getAllEntities: async () => allEntities,
}));
vi.mock('../config/env.js', () => ({
  loadConfig: () => ({ MAX_INVESTIGATIONS_PER_RUN: maxPerRun }),
}));

const { rankAndClusterCases } = await import('./rank.js');

function sig(over: Partial<Signal>): Signal {
  return {
    _id: over._id ?? 'sid',
    ocid: over.ocid ?? 'ocds-1',
    caseKey: over.caseKey ?? 'CK',
    rule_id: over.rule_id ?? 'single_bidder',
    family: over.family ?? 'F2',
    severity: over.severity ?? 'low',
    confidence: over.confidence ?? 0.5,
    primaryEntityId: over.primaryEntityId ?? 'GT-NIT:buyer',
    secondaryEntityIds: over.secondaryEntityIds ?? ['GT-NIT:sup'],
    timeWindow: over.timeWindow ?? 'scope:2026-01..2026-01',
    title: over.title ?? 't',
    explanation: over.explanation ?? 'e',
    story_angle: over.story_angle ?? 's',
    evidence: over.evidence ?? [{ field: 'awardValue', value: 100 }],
  };
}

beforeEach(() => {
  scopeSignals = [];
  allEntities = [];
  maxPerRun = 20;
});

describe('rankAndClusterCases', () => {
  it('empty signals → empty bundles', async () => {
    expect(await rankAndClusterCases({ scope: 'scope:x' })).toEqual([]);
  });

  it('fixed signal set → deterministic order (priority then confidence)', async () => {
    scopeSignals = [
      // case LOW — single low-severity signal
      sig({ caseKey: 'CASE_LOW', severity: 'low', confidence: 0.9 }),
      // case HIGH — a high-severity signal
      sig({ caseKey: 'CASE_HIGH', severity: 'high', confidence: 0.1 }),
      // case MED — two low signals (→ medium priority)
      sig({ caseKey: 'CASE_MED', severity: 'low', confidence: 0.5 }),
      sig({ caseKey: 'CASE_MED', severity: 'low', confidence: 0.5 }),
    ];
    allEntities = [];
    const bundles = await rankAndClusterCases({ scope: 'scope:x' });
    expect(bundles.map((b) => b.caseKey)).toEqual([
      'CASE_HIGH',
      'CASE_MED',
      'CASE_LOW',
    ]);
    expect(bundles[0]!.isLead).toBe(true);
    expect(bundles[1]!.isLead).toBe(false);
  });

  it('MAX_INVESTIGATIONS_PER_RUN cap respected (2 cases, cap 1 → 1 bundle)', async () => {
    maxPerRun = 1;
    scopeSignals = [
      sig({ caseKey: 'A', severity: 'high' }),
      sig({ caseKey: 'B', severity: 'low' }),
    ];
    const bundles = await rankAndClusterCases({ scope: 'scope:x' });
    expect(bundles).toHaveLength(1);
    expect(bundles[0]!.caseKey).toBe('A');
  });

  it('tie-break is stable: identical scores → caseKey ascending', async () => {
    scopeSignals = [
      sig({ caseKey: 'ZZZ', severity: 'low', confidence: 0.5 }),
      sig({ caseKey: 'AAA', severity: 'low', confidence: 0.5 }),
      sig({ caseKey: 'MMM', severity: 'low', confidence: 0.5 }),
    ];
    const bundles = await rankAndClusterCases({ scope: 'scope:x' });
    expect(bundles.map((b) => b.caseKey)).toEqual(['AAA', 'MMM', 'ZZZ']);
  });

  it('resolves buyer name from entityMap; flattens evidence (rule_id,ocid)', async () => {
    scopeSignals = [
      sig({
        caseKey: 'C',
        rule_id: 'zzz_rule',
        ocid: 'ocds-b',
        primaryEntityId: 'GT-NIT:99',
        evidence: [{ field: 'awardValue', value: 200 }],
      }),
      sig({
        caseKey: 'C',
        rule_id: 'aaa_rule',
        ocid: 'ocds-a',
        primaryEntityId: 'GT-NIT:99',
        evidence: [{ field: 'awardValue', value: 300 }],
      }),
    ];
    allEntities = [
      {
        _id: 'GT-NIT:99',
        name: 'MINISTERIO X',
        kind: 'buyer',
        entityType: 'company',
        rollup: {
          awardCount: 0,
          awardValue: 0,
          buyerIds: [],
          categoryFamilies: [],
          firstAwardDate: '',
          lastAwardDate: '',
          historyAvgValue: 0,
        },
      },
    ];
    const [b] = await rankAndClusterCases({ scope: 'scope:x' });
    expect(b!.buyer.name).toBe('MINISTERIO X');
    // aaa_rule sorts before zzz_rule → evidence value 300 first
    expect(b!.evidence.map((e) => e.value)).toEqual([300, 200]);
    expect(b!.firedRuleIds.sort()).toEqual(['aaa_rule', 'zzz_rule']);
  });
});
