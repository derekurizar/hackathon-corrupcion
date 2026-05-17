import { z } from 'zod';
import type { SceneDescriptor } from '../types.js';

const ClosingStatementSchema = z.object({
  whatItMeans: z.string(),
  // caveat is mandatory & non-empty (idea/05 validator rule 5).
  caveat: z.string().min(1),
  ctas: z.tuple([z.literal('methodology'), z.literal('listen'), z.literal('share')]),
  // Each conclusion is a full paragraph (not a one-liner); allow more of them.
  conclusions: z.array(z.string()).min(1).max(6),
});

export const closingStatement: SceneDescriptor = {
  sceneId: 'ClosingStatement',
  chapter: 'cierre',
  schema: ClosingStatementSchema,
  kinds: {
    whatItMeans: 'presentational',
    caveat: 'presentational',
    'ctas[]': 'bound',
    'conclusions[]': 'presentational',
  },
};
