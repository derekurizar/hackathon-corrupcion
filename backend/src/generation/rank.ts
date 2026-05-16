import type { Signal } from '../schema/index.js';
import { reviewPriority } from '../detection/review-priority.js';
import { getSignalsByScope } from '../repositories/signals.js';
import { getAllEntities } from '../repositories/entities.js';
import { loadConfig } from '../config/env.js';

const log = (m: string): void => console.error(`[rank] ${m}`);

/** Truncate a free-text value for grep-friendly key=value logging. */
function trunc(s: string, max = 40): string {
  return s.length > max ? `${s.slice(0, max)}...` : s;
}

/**
 * One ranked, narration-ready case = all signals sharing a `caseKey`
 * (one buyer × signal family × scope — idea/04 §"Case clustering").
 */
export interface CaseBundle {
  caseKey: string;
  buyer: { id: string; name: string };
  family: 'F1' | 'F2' | 'F3' | 'F4';
  scope: string;
  signals: Signal[];
  /**
   * Flattened evidence in the LOCKED order (signals sorted by
   * (rule_id ASC, ocid ASC), then each signal's `evidence` in array order).
   * Identical to `identity.evidenceHash` normalization and
   * `scene-contract/refs.flattenCaseEvidence` so `ev:<i>` resolves the same
   * way on the generation and SPA sides.
   */
  evidence: Signal['evidence'];
  entities: { supplierIds: string[] };
  firedRuleIds: string[];
  isLead: boolean;
}

const PRIORITY_RANK: Record<'high' | 'medium' | 'low', number> = {
  high: 0,
  medium: 1,
  low: 2,
};

/**
 * Max numeric evidence value whose `field` contains 'value' or 'amount'
 * (case-insensitive). This is the case's headline "value flagged". Falls back
 * to 0 when no such numeric evidence item exists.
 */
function caseTotalValue(signals: Signal[]): number {
  let max = 0;
  let found = false;
  for (const sig of signals) {
    for (const e of sig.evidence) {
      const f = e.field.toLowerCase();
      if (
        (f.includes('value') || f.includes('amount')) &&
        typeof e.value === 'number' &&
        Number.isFinite(e.value)
      ) {
        if (!found || e.value > max) {
          max = e.value;
          found = true;
        }
      }
    }
  }
  return found ? max : 0;
}

/**
 * Max ISO date string from evidence items whose `field` contains 'date'
 * (case-insensitive). Falls back to '' when none.
 */
function caseRecency(signals: Signal[]): string {
  let max = '';
  for (const sig of signals) {
    for (const e of sig.evidence) {
      if (
        e.field.toLowerCase().includes('date') &&
        typeof e.value === 'string' &&
        e.value > max
      ) {
        max = e.value;
      }
    }
  }
  return max;
}

/** Signals flattened to evidence in the LOCKED (rule_id ASC, ocid ASC) order. */
function flattenEvidence(signals: Signal[]): Signal['evidence'] {
  const sorted = [...signals].sort((a, b) => {
    const byRule = a.rule_id.localeCompare(b.rule_id);
    return byRule !== 0 ? byRule : a.ocid.localeCompare(b.ocid);
  });
  const flat: Signal['evidence'] = [];
  for (const s of sorted) {
    for (const e of s.evidence) flat.push(e);
  }
  return flat;
}

/**
 * Deterministic top-N case selection (idea/04 §"Case clustering"). Groups all
 * scope signals by `caseKey`, ranks by
 * `reviewPriority → aggConfidence → totalValue → recency → caseKey` (the last
 * a stable tiebreak), and slices to `MAX_INVESTIGATIONS_PER_RUN` (a cost
 * guard, not a product cap). The first surviving bundle is the run's lead.
 * Pure aside from the two repo reads; same input ⇒ identical ordered output.
 */
export async function rankAndClusterCases(args: {
  scope: string;
}): Promise<CaseBundle[]> {
  const cfg = loadConfig();
  const signals = await getSignalsByScope(args.scope);
  log(`scope=${args.scope} total_signals=${signals.length}`);
  if (signals.length === 0) return [];

  const entities = await getAllEntities();
  const entityMap = new Map(entities.map((e) => [e._id, e]));

  const groups = new Map<string, Signal[]>();
  for (const sig of signals) {
    const arr = groups.get(sig.caseKey);
    if (arr) arr.push(sig);
    else groups.set(sig.caseKey, [sig]);
  }
  log(`unique_cases=${groups.size}`);

  type Ranked = { bundle: CaseBundle; sortKey: [number, number, number, string, string] };
  const ranked: Ranked[] = [];

  for (const [caseKey, group] of groups) {
    const first = group[0]!;
    const priority = reviewPriority(group);
    const aggConfidence = group.reduce((s, sig) => s + sig.confidence, 0);
    const totalValue = caseTotalValue(group);
    const recency = caseRecency(group);
    const buyerId = first.primaryEntityId;
    const buyerName = entityMap.get(buyerId)?.name ?? buyerId;
    const family = first.family;
    const firedRuleIds = [...new Set(group.map((s) => s.rule_id))];
    const supplierIds = [
      ...new Set(group.flatMap((s) => s.secondaryEntityIds)),
    ];

    const bundle: CaseBundle = {
      caseKey,
      buyer: { id: buyerId, name: buyerName },
      family,
      scope: args.scope,
      signals: group,
      evidence: flattenEvidence(group),
      entities: { supplierIds },
      firedRuleIds,
      isLead: false,
    };

    ranked.push({
      bundle,
      // priority ASC, then aggConfidence/totalValue/recency DESC (negated),
      // then caseKey ASC for a fully stable order.
      sortKey: [
        PRIORITY_RANK[priority],
        -aggConfidence,
        -totalValue,
        // recency desc: invert by comparing strings in the comparator instead.
        recency,
        caseKey,
      ],
    });
  }

  ranked.sort((a, b) => {
    if (a.sortKey[0] !== b.sortKey[0]) return a.sortKey[0] - b.sortKey[0];
    if (a.sortKey[1] !== b.sortKey[1]) return a.sortKey[1] - b.sortKey[1];
    if (a.sortKey[2] !== b.sortKey[2]) return a.sortKey[2] - b.sortKey[2];
    // recency DESC (later date first)
    if (a.sortKey[3] !== b.sortKey[3])
      return a.sortKey[3] < b.sortKey[3] ? 1 : -1;
    // caseKey ASC (stable tiebreak)
    return a.sortKey[4] < b.sortKey[4] ? -1 : a.sortKey[4] > b.sortKey[4] ? 1 : 0;
  });

  const priorityLabel = (rankNum: number): string =>
    (Object.keys(PRIORITY_RANK) as Array<keyof typeof PRIORITY_RANK>).find(
      (k) => PRIORITY_RANK[k] === rankNum,
    ) ?? String(rankNum);
  const logCap = Math.max(30, cfg.MAX_INVESTIGATIONS_PER_RUN * 2);
  for (let i = 0; i < ranked.length && i < logCap; i += 1) {
    const r = ranked[i]!;
    const b = r.bundle;
    log(
      `case rank=${i + 1} caseKey=${b.caseKey} buyer="${trunc(b.buyer.name)}" ` +
        `family=${b.family} priority=${priorityLabel(r.sortKey[0])} ` +
        `aggConf=${(-r.sortKey[1]).toFixed(2)} totalValue=${-r.sortKey[2]} ` +
        `signals=${b.signals.length}`,
    );
  }

  const bundles = ranked
    .slice(0, cfg.MAX_INVESTIGATIONS_PER_RUN)
    .map((r) => r.bundle);
  if (bundles.length > 0) bundles[0]!.isLead = true;
  log(
    `selected top=${bundles.length} of ${groups.size} cases ` +
      `(MAX_INVESTIGATIONS_PER_RUN=${cfg.MAX_INVESTIGATIONS_PER_RUN})`,
  );
  return bundles;
}
