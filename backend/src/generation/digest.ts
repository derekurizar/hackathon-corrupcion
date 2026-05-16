import type { EvidenceItem, Signal } from '../schema/index.js';
import { loadConfig } from '../config/env.js';
import { caseTotalValue, type CaseBundle } from './rank.js';

/**
 * Compact, deterministic projection of a `CaseBundle` for narration
 * (idea/04 §"Per-case user block"). A "case" is one buyer × signal-family ×
 * full-year scope, so a rule like `single_bidder` fires once per contract and
 * `bundle.evidence` can hold tens of thousands of near-identical rows. The
 * detection engine already knows the aggregate; the LLM only needs per-rule
 * rollups + a small, money-ranked representative sample whose `ev:<i>` indices
 * still point into the FULL server-side `bundle.evidence` (so guardrail /
 * scene-plan ref resolution is unaffected).
 *
 * Purity: this module performs no I/O. Same `bundle` + `cfg` ⇒ byte-identical
 * `CaseDigest` ⇒ byte-identical rendered block.
 */

export interface RepresentativeEvidence {
  /** ORIGINAL index into the full locked `bundle.evidence` — never renumbered. */
  ev: number;
  field: string;
  value: unknown;
  comparison?: string;
  benchmark?: unknown;
}

export interface RuleDigest {
  ruleId: string;
  family: 'F1' | 'F2' | 'F3' | 'F4';
  signalCount: number;
  /** Distinct ocids among this rule's signals. */
  distinctContracts: number;
  severityCounts: { high: number; medium: number; low: number };
  /** Σ confidence, summed in the locked (rule_id, ocid) order. */
  aggConfidence: number;
  maxConfidence: number;
  /** Max money-hinted evidence value across this rule (0 when none). */
  representativeValue: number;
  /** Σ over signals of each signal's max money-hinted value. */
  summedValue: number;
  dateRange: { min: string; max: string } | null;
  explanation: string;
  storyAngle: string;
  /** Top-K by value DESC, then `ev` ASC. */
  sample: RepresentativeEvidence[];
}

export interface WorstComparison {
  ruleId: string;
  ev: number;
  field: string;
  comparison: string;
  metric: number;
}

export interface CaseDigest {
  caseKey: string;
  buyer: { id: string; name: string };
  family: 'F1' | 'F2' | 'F3' | 'F4';
  scope: string;
  totalEvidenceCount: number;
  totalSignalCount: number;
  headline: {
    totalValue: number;
    contractCount: number;
    dateRange: { min: string; max: string } | null;
    topSuppliers: { id: string; signalCount: number }[];
    worstComparisons: WorstComparison[];
  };
  rules: RuleDigest[];
  /** True when the per-rule or global cap dropped some representative items. */
  sampleTruncated: boolean;
}

export interface DigestConfig {
  samplePerRule: number;
  maxRepresentative: number;
  maxWorstComparisons: number;
  maxTopSuppliers: number;
}

const MAX_WORST_COMPARISONS = 5;
const MAX_TOP_SUPPLIERS = 5;
const MAX_BENCHMARK_CHARS = 120;
const BENCHMARK_METRIC_KEYS = ['share', 'multiple', 'ratio', 'clusterSum', 'sum'] as const;

/** Lazy, like `rank.ts` — keeps `buildCaseDigest` itself pure for tests. */
export function resolveDigestConfig(): DigestConfig {
  const cfg = loadConfig();
  return {
    samplePerRule: cfg.EVIDENCE_SAMPLE_PER_RULE,
    maxRepresentative: cfg.MAX_REPRESENTATIVE_EVIDENCE,
    maxWorstComparisons: MAX_WORST_COMPARISONS,
    maxTopSuppliers: MAX_TOP_SUPPLIERS,
  };
}

/** Money-hinted numeric evidence value (same predicate as rank.caseTotalValue). */
function moneyValue(e: EvidenceItem): number | null {
  const f = e.field.toLowerCase();
  if (
    (f.includes('value') || f.includes('amount')) &&
    typeof e.value === 'number' &&
    Number.isFinite(e.value)
  ) {
    return e.value;
  }
  return null;
}

/** ISO-date string evidence value (same predicate as rank.caseRecency). */
function dateValue(e: EvidenceItem): string | null {
  if (e.field.toLowerCase().includes('date') && typeof e.value === 'string') {
    return e.value;
  }
  return null;
}

/**
 * Normalized anomaly magnitude used to rank "worst comparisons": a numeric
 * benchmark or a known benchmark-object key (share / multiple / ratio /
 * clusterSum / sum). Raw money values are deliberately NOT used — they are
 * already surfaced by totalValue/representativeValue and would otherwise drown
 * out genuine benchmark deviations across incomparable units. Never parses the
 * free-text `comparison` string. Returns null when nothing extractable.
 */
function comparisonMetric(e: EvidenceItem): number | null {
  if (e.comparison === undefined) return null;
  const b = e.benchmark;
  if (typeof b === 'number' && Number.isFinite(b)) return b;
  if (b !== null && typeof b === 'object') {
    const rec = b as Record<string, unknown>;
    for (const k of BENCHMARK_METRIC_KEYS) {
      const v = rec[k];
      if (typeof v === 'number' && Number.isFinite(v)) return v;
    }
  }
  return null;
}

/** The locked (rule_id ASC, ocid ASC) sort — identical to rank.flattenEvidence. */
function lockedSort<T extends Pick<Signal, 'rule_id' | 'ocid'>>(signals: readonly T[]): T[] {
  return [...signals].sort((a, b) => {
    const byRule = a.rule_id.localeCompare(b.rule_id);
    return byRule !== 0 ? byRule : a.ocid.localeCompare(b.ocid);
  });
}

interface FlatEv {
  ev: number;
  ruleId: string;
  signal: Signal;
  item: EvidenceItem;
}

/**
 * Re-walk the EXACT `rank.flattenEvidence` iteration carrying the source
 * signal, so each item's `ev` equals its position in `bundle.evidence`.
 */
function flattenWithIndex(signals: readonly Signal[]): FlatEv[] {
  const sorted = lockedSort(signals);
  const flat: FlatEv[] = [];
  let i = 0;
  for (const s of sorted) {
    for (const item of s.evidence) {
      flat.push({ ev: i, ruleId: s.rule_id, signal: s, item });
      i += 1;
    }
  }
  return flat;
}

function toRepresentative(f: FlatEv): RepresentativeEvidence {
  return {
    ev: f.ev,
    field: f.item.field,
    value: f.item.value,
    ...(f.item.comparison !== undefined ? { comparison: f.item.comparison } : {}),
    ...(f.item.benchmark !== undefined ? { benchmark: f.item.benchmark } : {}),
  };
}

export function buildCaseDigest(bundle: CaseBundle, cfg: DigestConfig): CaseDigest {
  const flat = flattenWithIndex(bundle.signals);

  // Group flattened evidence + signals by rule_id.
  const byRuleEv = new Map<string, FlatEv[]>();
  for (const f of flat) {
    const arr = byRuleEv.get(f.ruleId);
    if (arr) arr.push(f);
    else byRuleEv.set(f.ruleId, [f]);
  }
  const byRuleSignals = new Map<string, Signal[]>();
  for (const s of lockedSort(bundle.signals)) {
    const arr = byRuleSignals.get(s.rule_id);
    if (arr) arr.push(s);
    else byRuleSignals.set(s.rule_id, [s]);
  }

  const ruleIds = [...byRuleSignals.keys()].sort((a, b) => a.localeCompare(b));

  let remaining = cfg.maxRepresentative;
  let truncated = false;

  const rules: RuleDigest[] = ruleIds.map((ruleId) => {
    const sigs = byRuleSignals.get(ruleId) ?? [];
    const evs = byRuleEv.get(ruleId) ?? [];
    const first = sigs[0]!;

    const severityCounts = { high: 0, medium: 0, low: 0 };
    let aggConfidence = 0;
    let maxConfidence = 0;
    let summedValue = 0;
    const ocids = new Set<string>();
    for (const s of sigs) {
      severityCounts[s.severity] += 1;
      aggConfidence += s.confidence;
      if (s.confidence > maxConfidence) maxConfidence = s.confidence;
      ocids.add(s.ocid);
      let sigMax = 0;
      for (const e of s.evidence) {
        const mv = moneyValue(e);
        if (mv !== null && mv > sigMax) sigMax = mv;
      }
      summedValue += sigMax;
    }

    let representativeValue = 0;
    let dMin = '';
    let dMax = '';
    for (const f of evs) {
      const mv = moneyValue(f.item);
      if (mv !== null && mv > representativeValue) representativeValue = mv;
      const dv = dateValue(f.item);
      if (dv !== null) {
        if (dMin === '' || dv < dMin) dMin = dv;
        if (dv > dMax) dMax = dv;
      }
    }

    // Money-ranked sample: value DESC, then ev ASC (a strict total order).
    const ranked = [...evs].sort((a, b) => {
      const av = moneyValue(a.item) ?? -Infinity;
      const bv = moneyValue(b.item) ?? -Infinity;
      if (av !== bv) return bv - av;
      return a.ev - b.ev;
    });
    const perRuleCap = Math.min(cfg.samplePerRule, Math.max(remaining, 0));
    if (ranked.length > perRuleCap) truncated = true;
    const sample = ranked.slice(0, perRuleCap).map(toRepresentative);
    remaining -= sample.length;

    return {
      ruleId,
      family: first.family,
      signalCount: sigs.length,
      distinctContracts: ocids.size,
      severityCounts,
      aggConfidence,
      maxConfidence,
      representativeValue,
      summedValue,
      dateRange: dMax !== '' ? { min: dMin, max: dMax } : null,
      explanation: first.explanation,
      storyAngle: first.story_angle,
      sample,
    };
  });

  // Headline — distinct ocids, date range, top suppliers, worst comparisons.
  const allOcids = new Set<string>();
  let hMin = '';
  let hMax = '';
  for (const f of flat) {
    allOcids.add(f.signal.ocid);
    const dv = dateValue(f.item);
    if (dv !== null) {
      if (hMin === '' || dv < hMin) hMin = dv;
      if (dv > hMax) hMax = dv;
    }
  }

  const supplierCounts = new Map<string, number>();
  for (const s of bundle.signals) {
    for (const id of new Set(s.secondaryEntityIds)) {
      supplierCounts.set(id, (supplierCounts.get(id) ?? 0) + 1);
    }
  }
  const topSuppliers = [...supplierCounts.entries()]
    .map(([id, signalCount]) => ({ id, signalCount }))
    .sort((a, b) =>
      a.signalCount !== b.signalCount ? b.signalCount - a.signalCount : a.id.localeCompare(b.id),
    )
    .slice(0, cfg.maxTopSuppliers);

  const worstComparisons: WorstComparison[] = flat
    .map((f) => {
      const metric = comparisonMetric(f.item);
      return metric === null || f.item.comparison === undefined
        ? null
        : {
            ruleId: f.ruleId,
            ev: f.ev,
            field: f.item.field,
            comparison: f.item.comparison,
            metric,
          };
    })
    .filter((w): w is WorstComparison => w !== null)
    .sort((a, b) => {
      if (a.metric !== b.metric) return b.metric - a.metric;
      const byRule = a.ruleId.localeCompare(b.ruleId);
      return byRule !== 0 ? byRule : a.ev - b.ev;
    })
    .slice(0, cfg.maxWorstComparisons);

  return {
    caseKey: bundle.caseKey,
    buyer: bundle.buyer,
    family: bundle.family,
    scope: bundle.scope,
    totalEvidenceCount: bundle.evidence.length,
    totalSignalCount: bundle.signals.length,
    headline: {
      totalValue: caseTotalValue(bundle.signals),
      contractCount: allOcids.size,
      dateRange: hMax !== '' ? { min: hMin, max: hMax } : null,
      topSuppliers,
      worstComparisons,
    },
    rules,
    sampleTruncated: truncated,
  };
}

/** Compact, length-bounded benchmark rendering (deterministic, locale-free). */
function fmtBenchmark(b: unknown): string {
  let s: string;
  try {
    s = JSON.stringify(b) ?? String(b);
  } catch {
    s = String(b);
  }
  return s.length > MAX_BENCHMARK_CHARS ? `${s.slice(0, MAX_BENCHMARK_CHARS - 3)}...` : s;
}

function fmtEvidence(e: RepresentativeEvidence): string {
  const parts = [`ev:${e.ev} field=${e.field} value=${String(e.value)}`];
  if (e.comparison !== undefined) parts.push(`comparison="${e.comparison}"`);
  if (e.benchmark !== undefined) parts.push(`benchmark=${fmtBenchmark(e.benchmark)}`);
  return `- ${parts.join(' ')}`;
}

function fmtDateRange(r: { min: string; max: string } | null): string {
  return r ? `${r.min}..${r.max}` : '(none)';
}

/**
 * The aggregated middle of the user block (CASE DIGEST … NOTE). The CASE
 * header, ENTITIES, totalValue/currency and closing instruction stay in
 * `buildUserBlock`.
 */
export function renderDigestBlock(d: CaseDigest): string {
  const lines: string[] = [];

  lines.push(
    'CASE DIGEST — aggregated per-rule rollups + a deterministic representative',
    'sample. Rollup counts/sums ARE evidence and may be cited. Every ev:<i> is a',
    'STABLE index into the full server-side evidence; cite only ev:<i> shown here.',
    '',
    'HEADLINE',
    `- totalValue: ${d.headline.totalValue}   currency: GTQ`,
    `- contracts (distinct ocids): ${d.headline.contractCount}`,
    `- date range: ${fmtDateRange(d.headline.dateRange)}`,
  );
  lines.push(
    d.headline.topSuppliers.length > 0
      ? `- top suppliers (by signal count): ${d.headline.topSuppliers
          .map((s) => `${s.id} (${s.signalCount})`)
          .join(', ')}`
      : '- top suppliers (by signal count): (none)',
  );
  if (d.headline.worstComparisons.length > 0) {
    lines.push('- worst comparisons:');
    for (const w of d.headline.worstComparisons) {
      lines.push(
        `  - rule=${w.ruleId} ev:${w.ev} field=${w.field} ` +
          `comparison="${w.comparison}" metric=${w.metric}`,
      );
    }
  } else {
    lines.push('- worst comparisons: (none)');
  }

  lines.push('', 'FIRED RULES (rollup)');
  if (d.rules.length === 0) {
    lines.push('- (none)');
  }
  for (const r of d.rules) {
    lines.push(
      `- rule=${r.ruleId} family=${r.family} signals=${r.signalCount} ` +
        `contracts=${r.distinctContracts}`,
      `  severity[high=${r.severityCounts.high} med=${r.severityCounts.medium} ` +
        `low=${r.severityCounts.low}] aggConf=${r.aggConfidence.toFixed(2)} ` +
        `maxConf=${r.maxConfidence}`,
      `  value: representative=${r.representativeValue} ` +
        `summed=${r.summedValue}  dates=${fmtDateRange(r.dateRange)}`,
      `  explanation: ${r.explanation}`,
      `  story_angle: ${r.storyAngle}`,
      `  representative evidence (top ${r.sample.length} by value desc):`,
    );
    if (r.sample.length === 0) lines.push('  - (none)');
    for (const e of r.sample) lines.push(`  ${fmtEvidence(e)}`);
  }

  lines.push(
    '',
    `NOTE: showing up to ${
      d.rules.length > 0 ? Math.max(...d.rules.map((r) => r.sample.length)) : 0
    } of ${d.totalEvidenceCount} evidence items per rule` +
      (d.sampleTruncated ? ' (capped)' : '') +
      '; full evidence is retained server-side. Do not infer counts beyond the',
    'rollups above.',
  );

  return lines.join('\n');
}
