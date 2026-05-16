import { z } from 'zod';

export const EntitySchema = z.object({
  _id: z.string(),
  name: z.string(),
  kind: z.enum(['supplier', 'buyer']),
  entityType: z.enum(['company', 'individual', 'unknown']),
  legalEntityTypeDetail: z.string().optional(),
  rollup: z.object({
    awardCount: z.number().int(),
    awardValue: z.number(),
    buyerIds: z.array(z.string()),
    categoryFamilies: z.array(z.string()),
    firstAwardDate: z.string(),
    lastAwardDate: z.string(),
    historyAvgValue: z.number(),
  }),
});

export type Entity = z.infer<typeof EntitySchema>;
