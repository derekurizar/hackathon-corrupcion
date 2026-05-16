import { z } from 'zod';

export const EditionSchema = z.object({
  _id: z.string(),
  publishedAt: z.string(),
  leadCaseKey: z.string(),
  highlightCaseKeys: z.array(z.string()),
  stats: z.object({
    count: z.number().int(),
    totalValueFlagged: z.number(),
    byFamily: z.object({
      F1: z.number().int(),
      F2: z.number().int(),
      F3: z.number().int(),
      F4: z.number().int(),
    }),
  }),
});

export type Edition = z.infer<typeof EditionSchema>;
