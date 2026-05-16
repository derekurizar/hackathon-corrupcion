import type { CuratedRelease } from '../schema/curated-release.js';
import type { Benchmark } from '../schema/benchmarks.js';
import type { RuleConfig } from './config.js';

/**
 * Per-supplier rollup view used by the rules. Extends the persisted
 * `Entity['rollup']` shape with the per-buyer supplier-share maps that rules
 * 7/8 need (built in-memory by `build-benchmarks` / `run-detection`, never
 * persisted to the entities collection).
 */
export type RollupData = {
  awardCount: number;
  awardValue: number;
  buyerIds: string[];
  categoryFamilies: string[];
  firstAwardDate: string;
  lastAwardDate: string;
  historyAvgValue: number;
  /** supplierId (canonical) → total value this entity awarded *as a buyer*. */
  supplierValueMap?: Record<string, number>;
  /** supplierId (canonical) → award count this entity awarded *as a buyer*. */
  supplierCountMap?: Record<string, number>;
};

/**
 * Read-only canonical-id + rollup lookups handed to every rule. Implemented in
 * `run-detection.ts` from the entities collection + accumulated rollups.
 */
export type EntityIndex = {
  canonicalOf(rawId: string): string;
  rollup(canonicalId: string): RollupData | undefined;
  entityType(canonicalId: string): 'company' | 'individual' | 'unknown';
  allCanonicalEntityIds: Set<string>;
};

export type RuleContext = {
  release: CuratedRelease;
  benchmarks: Benchmark;
  entities: EntityIndex;
  config: RuleConfig;
};

/**
 * A rule's raw emission. `signal_id`/`timeWindow`/`caseKey` are placeholders
 * that the orchestrator (`run-detection.ts`) overwrites with deterministic,
 * scope-bound values before persistence.
 */
export type ContractSignal = {
  signal_id: string;
  rule_id: string;
  ocid: string;
  family: 'F1' | 'F2' | 'F3' | 'F4';
  severity: 'low' | 'medium' | 'high';
  confidence: number;
  title: string;
  explanation: string;
  evidence: {
    field: string;
    value: unknown;
    comparison?: string;
    benchmark?: unknown;
  }[];
  story_angle: string;
  /** ALWAYS the canonical buyer.id (institution-centric). */
  primaryEntityId: string;
  /** Canonical supplier ids (anonymized downstream). */
  secondaryEntityIds?: string[];
  /** Scope label, e.g. `scope:2026-04..2026-04` (overwritten by orchestrator). */
  timeWindow: string;
  caseKey: string;
};

export type Rule = {
  id: string;
  family: 'F1' | 'F2' | 'F3' | 'F4';
  needsHistory: boolean;
  run: (ctx: RuleContext) => ContractSignal[];
};
