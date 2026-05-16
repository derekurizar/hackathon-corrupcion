import type { CuratedRelease } from '../schema/curated-release.js';
import type { Benchmark } from '../schema/benchmarks.js';
import type { RuleConfig } from './config.js';

/**
 * An award's UNSPSC category = the most-frequent 4-digit family among the
 * tender's items (idea/03 §"Category resolution"). `tender.itemFamilies` is
 * the deduped set of 4-char prefixes computed at ingestion (`normalize.ts`),
 * so frequency information is lost there. We therefore count occurrences over
 * `tender.items[].classificationId` (8-digit UNSPSC), falling back to
 * `itemFamilies[0]` when items are absent. Tie-break: first family encountered
 * (insertion order over items, then itemFamilies).
 *
 * Returns `''` when no 4-digit family can be derived (caller must guard).
 */
export function awardCategory(release: CuratedRelease): string {
  const counts = new Map<string, number>();
  const order: string[] = [];
  for (const item of release.tender.items) {
    const cid = item.classificationId;
    if (cid.length < 4) continue;
    const fam = cid.slice(0, 4);
    if (!counts.has(fam)) order.push(fam);
    counts.set(fam, (counts.get(fam) ?? 0) + 1);
  }
  // Fallback: items absent/too-short but itemFamilies populated at ingest.
  if (order.length === 0) {
    for (const fam of release.tender.itemFamilies) {
      if (fam.length < 4) continue;
      if (!counts.has(fam)) order.push(fam);
      counts.set(fam, (counts.get(fam) ?? 0) + 1);
    }
  }
  if (order.length === 0) return '';

  let best = order[0]!;
  let bestCount = counts.get(best) ?? 0;
  for (const fam of order) {
    const c = counts.get(fam) ?? 0;
    if (c > bestCount) {
      best = fam;
      bestCount = c;
    }
  }
  return best;
}

/**
 * Resolves the benchmark bucket for a 4-digit family with the idea/03 fallback
 * ladder: 4-digit family → 2-digit segment → `mainProcurementCategory`
 * (goods/services/works). A level is only accepted if its stored
 * `count >= config.CATEGORY_MIN_SAMPLE`; otherwise fall through. Returns the
 * resolved stats + the key actually used, or `undefined` when no level has a
 * sufficient sample.
 *
 * NOTE: `build-benchmarks` is responsible for writing the family-level,
 * segment-level (2-digit key) and category-level (goods/services/works key)
 * entries into `categoryPrice` so this lookup can succeed.
 */
export function resolveCategoryLevel(
  family: string,
  mainProcurementCategory: string,
  categoryPrice: Benchmark['categoryPrice'],
  config: RuleConfig,
): { stats: Benchmark['categoryPrice'][string]; key: string } | undefined {
  const tryKey = (
    key: string,
  ): { stats: Benchmark['categoryPrice'][string]; key: string } | undefined => {
    const stats = categoryPrice[key];
    if (stats && stats.count >= config.CATEGORY_MIN_SAMPLE) {
      return { stats, key };
    }
    return undefined;
  };

  if (family.length >= 4) {
    const fam = tryKey(family);
    if (fam) return fam;
  }
  if (family.length >= 2) {
    const seg = tryKey(family.slice(0, 2));
    if (seg) return seg;
  }
  if (mainProcurementCategory) {
    const cat = tryKey(mainProcurementCategory);
    if (cat) return cat;
  }
  return undefined;
}
