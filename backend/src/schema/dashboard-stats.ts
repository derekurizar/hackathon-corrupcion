import { z } from 'zod';

export const DashboardStatsSchema = z.object({
  _id: z.literal('current'),
  computedAt: z.string(),
  counters: z.object({
    records: z.number().int(),
    valueAnalyzed: z.number(),
    entities: z.number().int(),
    monthsCovered: z.number().int(),
    investigations: z.number().int(),
  }),
  methodBreakdown: z.record(z.string(), z.number()),
  byFamily: z.object({
    F1: z.number().int(),
    F2: z.number().int(),
    F3: z.number().int(),
    F4: z.number().int(),
  }),
  priorityDist: z.object({
    high: z.number().int(),
    medium: z.number().int(),
    low: z.number().int(),
  }),
  trend: z.array(z.object({ month: z.string(), flagged: z.number().int(), value: z.number() })),
  topBuyersByFlaggedValue: z.array(
    z.object({ id: z.string(), name: z.string(), value: z.number() }),
  ),
});

export type DashboardStats = z.infer<typeof DashboardStatsSchema>;
