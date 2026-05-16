import { z } from 'zod';

export const PipelineRunSchema = z.object({
  _id: z.string(),
  startedAt: z.string(),
  finishedAt: z.string().optional(),
  monthsRequested: z.array(z.object({ year: z.number().int(), month: z.number().int() })),
  toggles: z.record(z.string(), z.boolean()),
  stages: z.record(z.string(), z.string()),
  counts: z.object({
    recordsIngested: z.number().int(),
    signals: z.number().int(),
    investigations: z.number().int(),
  }),
  errors: z.array(z.unknown()),
});

export type PipelineRun = z.infer<typeof PipelineRunSchema>;
