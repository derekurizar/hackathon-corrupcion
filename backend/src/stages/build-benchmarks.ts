import { loadConfig } from '../config/env.js';
import { BenchmarkSchema, type Benchmark } from '../schema/benchmarks.js';
import type { Entity } from '../schema/entities.js';
import type { CuratedRelease } from '../schema/curated-release.js';
import {
  iterateCuratedReleases,
  upsertBenchmark,
} from '../repositories/index.js';
import {
  getAllEntities,
  bulkSetEntityRollups,
} from '../repositories/entities.js';
import {
  startRun,
  markStage,
  setCounts,
  appendError,
  finishRun,
} from '../repositories/pipeline-runs.js';
import { rawToCanonical } from '../detection/entity-id.js';
import { awardCategory } from '../detection/category.js';
import { median, percentile, parseDateMs } from '../detection/rule-helpers.js';
import { defaultRuleConfig } from '../detection/config.js';

export interface BuildBenchmarksArgs {
  /** Scope label (`scope:YYYY-MM..YYYY-MM`). Optional — computed from the
   * corpus periodScope when omitted. */
  scope?: string;
  /** Compute + validate the doc but perform NO DB writes. */
  dryRun?: boolean;
}

export interface BuildBenchmarksResult {
  scope: string;
  releases: number;
  entities: number;
  runId?: string;
}

const log = (m: string): void => console.error(`[benchmarks] ${m}`);

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** ISO date → `YYYY-MM` (UTC); '' on parse failure. */
function monthKey(iso: string): string {
  const ms = parseDateMs(iso);
  if (ms === null) return '';
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** ISO date → ISO week bucket key `YYYY-Www` (UTC, Monday-based). */
function weekKey(iso: string): string {
  const ms = parseDateMs(iso);
  if (ms === null) return '';
  const d = new Date(ms);
  // Shift to nearest Thursday (ISO 8601 week-year rule).
  const day = (d.getUTCDay() + 6) % 7; // Mon=0..Sun=6
  const thursday = new Date(d.getTime() - day * MS_PER_DAY + 3 * MS_PER_DAY);
  const year = thursday.getUTCFullYear();
  const jan1 = Date.UTC(year, 0, 1);
  const week =
    1 + Math.floor((thursday.getTime() - jan1) / (7 * MS_PER_DAY));
  return `${year}-W${String(week).padStart(2, '0')}`;
}

type RollupAccum = {
  awardCount: number;
  awardValue: number;
  buyerIds: Set<string>;
  categoryFamilies: Set<string>;
  firstAwardDate: string;
  lastAwardDate: string;
  /** for buyers acting as buyer: supplier → value / count */
  supplierValue: Map<string, number>;
  supplierCount: Map<string, number>;
};

function emptyRollup(): RollupAccum {
  return {
    awardCount: 0,
    awardValue: 0,
    buyerIds: new Set(),
    categoryFamilies: new Set(),
    firstAwardDate: '',
    lastAwardDate: '',
    supplierValue: new Map(),
    supplierCount: new Map(),
  };
}

function noteDate(r: RollupAccum, date: string): void {
  if (date === '') return;
  if (r.firstAwardDate === '' || date < r.firstAwardDate) r.firstAwardDate = date;
  if (r.lastAwardDate === '' || date > r.lastAwardDate) r.lastAwardDate = date;
}

/**
 * Benchmark stage (replaces the Area 01 throwing stub; same exported symbol
 * `buildBenchmarks`). ONE streaming pass over `iterateCuratedReleases`
 * accumulating bounded in-memory aggregates, then derives the `benchmarks`
 * doc + per-entity rollups. NEVER `.toArray()`s the corpus cursor.
 *
 * `_id` / scope label = `scope:<minMonth>..<maxMonth>`.
 */
export async function buildBenchmarks(
  args: BuildBenchmarksArgs = {},
): Promise<BuildBenchmarksResult> {
  const cfg = loadConfig();
  const config = defaultRuleConfig;
  log(`start scope=${args.scope ?? '(auto)'} dryRun=${args.dryRun ?? false}`);

  if (!cfg.RUN_BENCHMARKS && !args.dryRun) {
    log('skipped via RUN_BENCHMARKS=false');
    return { scope: args.scope ?? '', releases: 0, entities: 0 };
  }

  // Entity-type lookup (from the entities collection: company/individual).
  const allEntities = args.dryRun ? [] : await getAllEntities();
  const entityTypeById = new Map<string, Entity['entityType']>();
  for (const e of allEntities) entityTypeById.set(e._id, e.entityType);

  let runId: string | undefined;
  if (!args.dryRun) {
    runId = await startRun({ months: [], toggles: { benchmarks: true } });
    await markStage(runId, 'benchmarks', 'running');
  }

  // --- Accumulators (bounded — Maps, not streamed arrays of releases) ---
  const familyAwardValues = new Map<string, number[]>();
  const familyTendererCounts = new Map<string, number[]>();
  const segmentAwardValues = new Map<string, number[]>();
  const segmentTendererCounts = new Map<string, number[]>();
  const catAwardValues = new Map<string, number[]>(); // goods/services/works
  const catTendererCounts = new Map<string, number[]>();
  // peer: per family → per buyer → values (median of per-buyer medians)
  const familyBuyerValues = new Map<string, Map<string, number[]>>();
  const buyerMethodValue = new Map<string, Map<string, number>>();
  const buyerMethodCount = new Map<string, Map<string, number>>();
  const nationalMethodValue = new Map<string, number>();
  const buyerAwardsByWeek = new Map<string, Map<string, number>>();
  const supplierRollup = new Map<string, RollupAccum>();
  const buyerRollup = new Map<string, RollupAccum>();
  const failedTenders: {
    buyerId: string;
    family: string;
    ocid: string;
    statusDetails: string;
    date: string;
  }[] = [];
  const splittingAwards: {
    buyerId: string;
    canonicalSupplierId: string;
    family: string;
    ocid: string;
    date: string;
    amount: number;
  }[] = [];
  const individualAwardValues: number[] = [];
  // per buyer → setKey → {tendererIds, winners count by id, occurrences}
  const tendererSets = new Map<
    string,
    Map<
      string,
      { tendererIds: string[]; winCount: Map<string, number>; occurrences: number }
    >
  >();

  let minMonth = '';
  let maxMonth = '';
  let releases = 0;

  const pushTo = (m: Map<string, number[]>, k: string, v: number): void => {
    const arr = m.get(k);
    if (arr) arr.push(v);
    else m.set(k, [v]);
  };

  try {
    for await (const release of iterateCuratedReleases({
      ...(args.scope !== undefined ? { scope: args.scope } : {}),
    })) {
      releases++;
      if (releases % 1000 === 0) log(`corpus pass releases=${releases}`);
      const buyerId = rawToCanonical(release.buyer.id);
      const family = awardCategory(release);
      const segment = family.length >= 2 ? family.slice(0, 2) : '';
      const mainCat = release.tender.mainProcurementCategory;
      const method = release.tender.procurementMethodDetails;
      const tenderers = release.tender.numberOfTenderers;

      const mk = monthKey(release.date);
      if (mk !== '') {
        if (minMonth === '' || mk < minMonth) minMonth = mk;
        if (maxMonth === '' || mk > maxMonth) maxMonth = mk;
      }

      // Failed tenders (Rule 6): Desierto / Prescindido status.
      const sd = release.tender.statusDetails;
      if ((sd === 'Desierto' || sd === 'Prescindido') && family !== '') {
        failedTenders.push({
          buyerId,
          family,
          ocid: release.ocid,
          statusDetails: sd,
          date: release.tender.datePublished,
        });
      }

      const br = buyerRollup.get(buyerId) ?? emptyRollup();
      buyerRollup.set(buyerId, br);

      for (const award of release.awards) {
        const amount = award.value.amount;
        // Category price + tenderer counts at family/segment/category levels.
        if (family !== '') {
          pushTo(familyAwardValues, family, amount);
          pushTo(familyTendererCounts, family, tenderers);
          let fb = familyBuyerValues.get(family);
          if (!fb) {
            fb = new Map();
            familyBuyerValues.set(family, fb);
          }
          pushTo(fb, buyerId, amount);
        }
        if (segment !== '') {
          pushTo(segmentAwardValues, segment, amount);
          pushTo(segmentTendererCounts, segment, tenderers);
        }
        if (mainCat !== '') {
          pushTo(catAwardValues, mainCat, amount);
          pushTo(catTendererCounts, mainCat, tenderers);
        }

        // Buyer rollup + per-buyer method mix.
        br.awardCount++;
        br.awardValue += amount;
        if (family !== '') br.categoryFamilies.add(family);
        noteDate(br, award.date);
        const bmv = buyerMethodValue.get(buyerId) ?? new Map();
        buyerMethodValue.set(buyerId, bmv);
        bmv.set(method, (bmv.get(method) ?? 0) + amount);
        const bmc = buyerMethodCount.get(buyerId) ?? new Map();
        buyerMethodCount.set(buyerId, bmc);
        bmc.set(method, (bmc.get(method) ?? 0) + 1);
        nationalMethodValue.set(
          method,
          (nationalMethodValue.get(method) ?? 0) + amount,
        );

        // Buyer weekly award counts (Rule 19).
        const wk = weekKey(award.date);
        if (wk !== '') {
          const wkMap = buyerAwardsByWeek.get(buyerId) ?? new Map();
          buyerAwardsByWeek.set(buyerId, wkMap);
          wkMap.set(wk, (wkMap.get(wk) ?? 0) + 1);
        }

        for (const rawSid of award.supplierIds) {
          const sid = rawToCanonical(rawSid);
          br.supplierValue.set(
            sid,
            (br.supplierValue.get(sid) ?? 0) + amount,
          );
          br.supplierCount.set(sid, (br.supplierCount.get(sid) ?? 0) + 1);

          const sr = supplierRollup.get(sid) ?? emptyRollup();
          supplierRollup.set(sid, sr);
          sr.awardCount++;
          sr.awardValue += amount;
          sr.buyerIds.add(buyerId);
          if (family !== '') sr.categoryFamilies.add(family);
          noteDate(sr, award.date);

          // Rule 12 cohort: individual-supplier award values.
          const et = entityTypeById.get(sid);
          if (et !== 'company') individualAwardValues.push(amount);

          // Rule 18: candidate splitting awards (each below per-award max).
          if (family !== '' && amount < config.RULE_18_PER_AWARD_MAX) {
            splittingAwards.push({
              buyerId,
              canonicalSupplierId: sid,
              family,
              ocid: release.ocid,
              date: award.date,
              amount,
            });
          }
        }
      }

      // Rule 10: tenderer-set recurrence per buyer (only with bids present).
      if (release.bids.length >= config.RULE_10_MIN_SET_SIZE) {
        const ids = [
          ...new Set(release.bids.map((b) => b.tendererId).filter((x) => x !== '')),
        ].sort();
        if (ids.length >= config.RULE_10_MIN_SET_SIZE) {
          const key = ids.join(',');
          const perBuyer = tendererSets.get(buyerId) ?? new Map();
          tendererSets.set(buyerId, perBuyer);
          const entry =
            perBuyer.get(key) ??
            { tendererIds: ids, winCount: new Map<string, number>(), occurrences: 0 };
          entry.occurrences++;
          const winners = new Set(release.awards.flatMap((a) => a.supplierIds));
          for (const w of winners) {
            if (ids.includes(w)) {
              entry.winCount.set(w, (entry.winCount.get(w) ?? 0) + 1);
            }
          }
          perBuyer.set(key, entry);
        }
      }
    }
  } catch (err) {
    if (runId) {
      await appendError(runId, {
        stage: 'benchmarks',
        releases,
        message: err instanceof Error ? err.message : String(err),
      });
      await markStage(runId, 'benchmarks', 'failed');
      await finishRun(runId);
    }
    throw err;
  }

  if (minMonth === '') minMonth = '0000-00';
  if (maxMonth === '') maxMonth = minMonth;
  const scope = args.scope ?? `scope:${minMonth}..${maxMonth}`;

  // --- Derive categoryPrice (family + segment + category levels) ---
  const categoryPrice: Benchmark['categoryPrice'] = {};
  const addLevel = (
    key: string,
    vals: number[],
    tcs: number[],
    level: string,
  ): void => {
    categoryPrice[key] = {
      median: median(vals),
      p25: percentile(vals, 25),
      p75: percentile(vals, 75),
      count: vals.length,
      level,
      tendererCountP25: percentile(tcs, 25),
    };
  };
  for (const [fam, vals] of familyAwardValues) {
    addLevel(fam, vals, familyTendererCounts.get(fam) ?? [], 'family');
  }
  for (const [seg, vals] of segmentAwardValues) {
    if (!categoryPrice[seg]) {
      addLevel(seg, vals, segmentTendererCounts.get(seg) ?? [], 'segment');
    }
  }
  for (const [cat, vals] of catAwardValues) {
    if (!categoryPrice[cat]) {
      addLevel(cat, vals, catTendererCounts.get(cat) ?? [], 'mainCategory');
    }
  }

  // peerCategoryMedian: per family, median of per-buyer medians.
  const peerCategoryMedian: Record<string, number> = {};
  for (const [fam, byBuyer] of familyBuyerValues) {
    const buyerMedians = [...byBuyer.values()].map((vs) => median(vs));
    peerCategoryMedian[fam] = median(buyerMedians);
  }

  // buyerMethodMix: shares of value & count per method per buyer.
  const buyerMethodMix: Benchmark['buyerMethodMix'] = {};
  for (const [bid, methodVal] of buyerMethodValue) {
    const totalVal = [...methodVal.values()].reduce((a, b) => a + b, 0);
    const methodCnt = buyerMethodCount.get(bid) ?? new Map();
    const totalCnt = [...methodCnt.values()].reduce((a, b) => a + b, 0);
    const mix: Record<string, { valueShare: number; countShare: number }> = {};
    for (const [m, v] of methodVal) {
      mix[m] = {
        valueShare: totalVal > 0 ? v / totalVal : 0,
        countShare: totalCnt > 0 ? (methodCnt.get(m) ?? 0) / totalCnt : 0,
      };
    }
    buyerMethodMix[bid] = mix;
  }

  // nationalMethodBaseline: value share per method nationally.
  const nationalTotal = [...nationalMethodValue.values()].reduce(
    (a, b) => a + b,
    0,
  );
  const nationalMethodBaseline: Record<string, number> = {};
  for (const [m, v] of nationalMethodValue) {
    nationalMethodBaseline[m] = nationalTotal > 0 ? v / nationalTotal : 0;
  }

  // cohortStats.individual.p90
  const cohortStats = {
    individual: {
      p90: percentile(individualAwardValues, 90),
      count: individualAwardValues.length,
    },
  };

  // buyerWeeklyBaseline: median + p75 of weekly award counts per buyer.
  const buyerWeeklyBaseline: Benchmark['buyerWeeklyBaseline'] = {};
  for (const [bid, wkMap] of buyerAwardsByWeek) {
    const counts = [...wkMap.values()];
    buyerWeeklyBaseline[bid] = {
      medianWeeklyAwardCount: median(counts),
      p75WeeklyAwardCount: percentile(counts, 75),
    };
  }

  // splittingClusters: slide a 30-day window over sorted award dates per
  // (buyer, supplier, family) tuple; emit clusters of >= RULE_18_MIN_AWARDS.
  const splittingClusters: Benchmark['splittingClusters'] = [];
  const byTuple = new Map<string, typeof splittingAwards>();
  for (const a of splittingAwards) {
    const k = `${a.buyerId}|${a.canonicalSupplierId}|${a.family}`;
    const arr = byTuple.get(k);
    if (arr) arr.push(a);
    else byTuple.set(k, [a]);
  }
  for (const [, awardsForTuple] of byTuple) {
    if (awardsForTuple.length < config.RULE_18_MIN_AWARDS) continue;
    const sorted = [...awardsForTuple].sort((a, b) => {
      const am = parseDateMs(a.date) ?? 0;
      const bm = parseDateMs(b.date) ?? 0;
      return am - bm;
    });
    let i = 0;
    while (i < sorted.length) {
      const startMs = parseDateMs(sorted[i]!.date) ?? 0;
      const windowMs = config.RULE_18_WINDOW_DAYS * MS_PER_DAY;
      let j = i;
      while (
        j < sorted.length &&
        (parseDateMs(sorted[j]!.date) ?? 0) - startMs <= windowMs
      ) {
        j++;
      }
      const slice = sorted.slice(i, j);
      const sum = slice.reduce((s, x) => s + x.amount, 0);
      if (
        slice.length >= config.RULE_18_MIN_AWARDS &&
        sum >= config.LCE_COMPRA_DIRECTA_MAX
      ) {
        const first = slice[0]!;
        splittingClusters.push({
          buyerId: first.buyerId,
          canonicalSupplierId: first.canonicalSupplierId,
          family: first.family,
          ocids: slice.map((x) => x.ocid),
          dates: slice.map((x) => x.date),
          amounts: slice.map((x) => x.amount),
          clusterSum: sum,
        });
        i = j; // non-overlapping clusters
      } else {
        i++;
      }
    }
  }

  // failedThenAwardIndex keyed "<buyerId>|<family>"
  const failedThenAwardIndex: Benchmark['failedThenAwardIndex'] = {};
  for (const f of failedTenders) {
    const key = `${f.buyerId}|${f.family}`;
    (failedThenAwardIndex[key] ??= []).push({
      priorOcid: f.ocid,
      statusDetails: f.statusDetails,
      date: f.date,
    });
  }

  // repeatWinnerIndex keyed by buyer id
  const repeatWinnerIndex: Benchmark['repeatWinnerIndex'] = {};
  for (const [bid, perBuyer] of tendererSets) {
    const sets: Benchmark['repeatWinnerIndex'][string]['tendererSets'] = [];
    for (const entry of perBuyer.values()) {
      if (entry.occurrences < config.RULE_10_MIN_RECURRENCE) continue;
      let topWinner = '';
      let topCount = 0;
      for (const [w, c] of entry.winCount) {
        if (c > topCount) {
          topCount = c;
          topWinner = w;
        }
      }
      sets.push({
        tendererIds: entry.tendererIds,
        winnerIds: topWinner ? [topWinner] : [],
        occurrences: entry.occurrences,
        winnerWinCount: topCount,
      });
    }
    if (sets.length > 0) repeatWinnerIndex[bid] = { tendererSets: sets };
  }

  const doc: Benchmark = BenchmarkSchema.parse({
    _id: scope,
    periodScope: { minMonth, maxMonth },
    categoryPrice,
    peerCategoryMedian,
    buyerMethodMix,
    nationalMethodBaseline,
    cohortStats,
    buyerWeeklyBaseline,
    splittingClusters,
    failedThenAwardIndex,
    repeatWinnerIndex,
  });

  const distinctEntities = supplierRollup.size + buyerRollup.size;

  if (args.dryRun) {
    return { scope, releases, entities: distinctEntities };
  }

  await upsertBenchmark(doc);

  // Entity rollups — exactly once per distinct entity seen (NOT recomputeRollup).
  // Convert accumulators to rollup entries, supplier wins over buyer for shared
  // ids (same `supplierRollup.has(id)` skip as before).
  const rollupEntries: Array<readonly [string, Entity['rollup']]> = [];
  const toRollup = (r: RollupAccum): Entity['rollup'] => ({
    awardCount: r.awardCount,
    awardValue: r.awardValue,
    buyerIds: [...r.buyerIds],
    categoryFamilies: [...r.categoryFamilies],
    firstAwardDate: r.firstAwardDate,
    lastAwardDate: r.lastAwardDate,
    historyAvgValue: r.awardCount > 0 ? r.awardValue / r.awardCount : 0,
  });
  for (const [id, r] of supplierRollup) rollupEntries.push([id, toRollup(r)]);
  for (const [id, r] of buyerRollup) {
    if (supplierRollup.has(id)) continue;
    rollupEntries.push([id, toRollup(r)]);
  }
  await bulkSetEntityRollups(rollupEntries);
  log(`rollups written entities=${rollupEntries.length} releases=${releases}`);

  if (runId) {
    await setCounts(runId, {
      recordsIngested: releases,
      signals: 0,
      investigations: 0,
    });
    await markStage(runId, 'benchmarks', 'done');
    await finishRun(runId);
  }

  log(`done scope=${scope} releases=${releases} entities=${distinctEntities}`);
  return {
    scope,
    releases,
    entities: distinctEntities,
    ...(runId !== undefined ? { runId } : {}),
  };
}

// Re-export accumulator-derived helpers indirectly used by integration tests
// is intentionally omitted — the int test recomputes from raw via the cursor.
export type { CuratedRelease };
