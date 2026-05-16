import type { Entity } from '../schema/entities.js';
import type { CuratedRelease } from '../schema/curated-release.js';
import type { EntityIndex, RollupData } from './types.js';
import { rawToCanonical } from './entity-id.js';

/**
 * Builds the read-only `EntityIndex` rules consume. Combines:
 *  - the persisted `entities` docs (entityType + base rollup), and
 *  - per-buyer supplier value/count maps recomputed from the corpus (rules
 *    3/7/8 need these and the frozen Benchmark/Entity schemas do not persist
 *    them).
 *
 * `releases` is iterated ONCE (the caller streams the cursor and passes each
 * release through `observe`), then `finish()` returns the index. Memory is
 * bounded: only per-entity aggregates are retained, never the releases.
 */
export function createEntityIndexBuilder(entities: Entity[]): {
  observe: (release: CuratedRelease) => void;
  finish: () => EntityIndex;
} {
  const typeById = new Map<string, Entity['entityType']>();
  const baseRollup = new Map<string, Entity['rollup']>();
  for (const e of entities) {
    typeById.set(e._id, e.entityType);
    baseRollup.set(e._id, e.rollup);
  }

  // Recompute rollups from the corpus so canonical ids line up with raw
  // supplier ids (the persisted rollup may be stale or schema-limited).
  const acc = new Map<
    string,
    {
      awardCount: number;
      awardValue: number;
      buyerIds: Set<string>;
      categoryFamilies: Set<string>;
      firstAwardDate: string;
      lastAwardDate: string;
      supplierValue: Map<string, number>;
      supplierCount: Map<string, number>;
    }
  >();
  const get = (id: string): NonNullable<ReturnType<typeof acc.get>> => {
    let a = acc.get(id);
    if (!a) {
      a = {
        awardCount: 0,
        awardValue: 0,
        buyerIds: new Set(),
        categoryFamilies: new Set(),
        firstAwardDate: '',
        lastAwardDate: '',
        supplierValue: new Map(),
        supplierCount: new Map(),
      };
      acc.set(id, a);
    }
    return a;
  };
  const noteDate = (
    a: NonNullable<ReturnType<typeof acc.get>>,
    d: string,
  ): void => {
    if (d === '') return;
    if (a.firstAwardDate === '' || d < a.firstAwardDate) a.firstAwardDate = d;
    if (a.lastAwardDate === '' || d > a.lastAwardDate) a.lastAwardDate = d;
  };

  function observe(release: CuratedRelease): void {
    const buyerId = rawToCanonical(release.buyer.id);
    const fam = release.tender.itemFamilies[0] ?? '';
    for (const award of release.awards) {
      const amount = award.value.amount;
      const b = get(buyerId);
      b.awardCount++;
      b.awardValue += amount;
      if (fam !== '') b.categoryFamilies.add(fam);
      noteDate(b, award.date);
      for (const rawSid of award.supplierIds) {
        const sid = rawToCanonical(rawSid);
        b.supplierValue.set(sid, (b.supplierValue.get(sid) ?? 0) + amount);
        b.supplierCount.set(sid, (b.supplierCount.get(sid) ?? 0) + 1);
        const s = get(sid);
        s.awardCount++;
        s.awardValue += amount;
        s.buyerIds.add(buyerId);
        if (fam !== '') s.categoryFamilies.add(fam);
        noteDate(s, award.date);
      }
    }
  }

  function finish(): EntityIndex {
    const rollups = new Map<string, RollupData>();
    for (const [id, a] of acc) {
      rollups.set(id, {
        awardCount: a.awardCount,
        awardValue: a.awardValue,
        buyerIds: [...a.buyerIds],
        categoryFamilies: [...a.categoryFamilies],
        firstAwardDate: a.firstAwardDate,
        lastAwardDate: a.lastAwardDate,
        historyAvgValue:
          a.awardCount > 0 ? a.awardValue / a.awardCount : 0,
        supplierValueMap: Object.fromEntries(a.supplierValue),
        supplierCountMap: Object.fromEntries(a.supplierCount),
      });
    }
    const allCanonicalEntityIds = new Set<string>([
      ...typeById.keys(),
      ...rollups.keys(),
    ]);
    return {
      canonicalOf: (rawId: string): string => rawToCanonical(rawId),
      rollup: (id: string): RollupData | undefined => {
        const recomputed = rollups.get(id);
        if (recomputed) return recomputed;
        const base = baseRollup.get(id);
        return base ? { ...base } : undefined;
      },
      entityType: (id: string): 'company' | 'individual' | 'unknown' =>
        typeById.get(id) ?? 'unknown',
      allCanonicalEntityIds,
    };
  }

  return { observe, finish };
}
