import { z } from 'zod';
import type { SceneDescriptor } from '../types.js';

const EvidenceLedgerSchema = z.object({
  items: z
    .array(
      z.object({
        field: z.string(),
        value: z.unknown(),
        benchmark: z.unknown().optional(),
        comparison: z.string().optional(),
      }),
    )
    .min(1),
  itemCaptions: z.array(z.string()),
  order: z.enum(['severity', 'field', 'original']),
  narration: z.string(),
});

export const evidenceLedger: SceneDescriptor = {
  sceneId: 'EvidenceLedger',
  chapter: 'evidencia',
  schema: EvidenceLedgerSchema,
  kinds: {
    'items[].field': 'bound',
    'items[].value': 'bound',
    'items[].benchmark': 'bound',
    'items[].comparison': 'bound',
    'itemCaptions[]': 'presentational',
    order: 'presentational',
    narration: 'presentational',
  },
};
