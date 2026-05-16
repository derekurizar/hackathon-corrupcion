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
    }),
  ),
  peerCategoryMedian: z.record(z.string(), z.number()),
  buyerMethodMix: z.record(
    z.string(),
    z.record(z.string(), z.object({ valueShare: z.number(), countShare: z.number() })),
  ),
  nationalMethodBaseline: z.record(z.string(), z.number()),
});

export type Benchmark = z.infer<typeof BenchmarkSchema>;
