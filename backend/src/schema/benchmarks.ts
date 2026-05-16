import { z } from 'zod';

export const BenchmarkSchema = z.object({
  _id: z.string(),
  periodScope: z.object({ minMonth: z.string(), maxMonth: z.string() }),
  categoryPrice: z.record(
    z.string(),
    z.object({
      median: z.number(),
      p25: z.number(),
      p75: z.number(),
      count: z.number().int(),
      level: z.string(),
      // Area 05 (Rule 2): per-family p25 of tender.numberOfTenderers.
      tendererCountP25: z.number(),
    }),
  ),
  peerCategoryMedian: z.record(z.string(), z.number()),
  buyerMethodMix: z.record(
    z.string(),
    z.record(z.string(), z.object({ valueShare: z.number(), countShare: z.number() })),
  ),
  nationalMethodBaseline: z.record(z.string(), z.number()),
  // Area 05 (Rule 12): individual-supplier award-value cohort stats.
  cohortStats: z.object({
    individual: z.object({ p90: z.number(), count: z.number().int() }),
  }),
  // Area 05 (Rule 19): per-buyer weekly award-count baseline. Key = buyer.id.
  buyerWeeklyBaseline: z.record(
    z.string(),
    z.object({
      medianWeeklyAwardCount: z.number(),
      p75WeeklyAwardCount: z.number(),
    }),
  ),
  // Area 05 (Rule 18): precomputed 30-day same buyer+supplier+family clusters.
  splittingClusters: z.array(
    z.object({
      buyerId: z.string(),
      canonicalSupplierId: z.string(),
      family: z.string(),
      ocids: z.array(z.string()),
      dates: z.array(z.string()),
      amounts: z.array(z.number()),
      clusterSum: z.number(),
    }),
  ),
  // Area 05 (Rule 6): prior failed tenders. Key = "buyerId|family".
  failedThenAwardIndex: z.record(
    z.string(),
    z.array(
      z.object({
        priorOcid: z.string(),
        statusDetails: z.string(),
        date: z.string(),
      }),
    ),
  ),
  // Area 05 (Rule 10): recurring tenderer-set patterns. Key = buyer.id.
  repeatWinnerIndex: z.record(
    z.string(),
    z.object({
      tendererSets: z.array(
        z.object({
          tendererIds: z.array(z.string()),
          winnerIds: z.array(z.string()),
          occurrences: z.number().int(),
          winnerWinCount: z.number().int(),
        }),
      ),
    }),
  ),
});

export type Benchmark = z.infer<typeof BenchmarkSchema>;
