import { z } from 'zod';
import type { SceneDescriptor } from '../types.js';

// Variant of CaseStatement (elCaso): prose + a framed key figure.
const CaseSplitSchema = z.object({
  lead: z.string(),
  body: z.string(),
  keyFigure: z.object({
    value: z.number(),
    label: z.string(),
    ref: z.string(),
  }),
  caption: z.string(),
});

export const caseSplit: SceneDescriptor = {
  sceneId: 'CaseSplit',
  chapter: 'elCaso',
  schema: CaseSplitSchema,
  kinds: {
    lead: 'presentational',
    body: 'presentational',
    'keyFigure.value': 'quant',
    'keyFigure.label': 'presentational',
    caption: 'presentational',
  },
};
