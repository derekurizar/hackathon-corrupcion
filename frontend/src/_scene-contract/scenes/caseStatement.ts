import { z } from 'zod';
import type { SceneDescriptor } from '../types.js';

const CaseStatementSchema = z.object({
  lead: z.string(),
  pullStat: z.object({
    value: z.number(),
    label: z.string(),
    ref: z.string(),
  }),
  facts: z
    .array(
      z.object({
        text: z.string(),
        valueRef: z.string().optional(),
      }),
    )
    .min(1)
    .max(3),
});

export const caseStatement: SceneDescriptor = {
  sceneId: 'CaseStatement',
  chapter: 'elCaso',
  schema: CaseStatementSchema,
  kinds: {
    lead: 'presentational',
    'pullStat.value': 'quant',
    'pullStat.label': 'presentational',
    'facts[].text': 'presentational',
    'facts[].valueRef': 'quant',
  },
};
