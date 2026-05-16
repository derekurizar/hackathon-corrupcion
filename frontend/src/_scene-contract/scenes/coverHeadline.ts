import { z } from 'zod';
import type { SceneDescriptor } from '../types.js';

const CoverHeadlineSchema = z.object({
  kicker: z.string(),
  headline: z.string(),
  dek: z.string(),
  bgVariant: z.enum(['dark', 'duotone', 'redGlow']),
  heroStat: z.object({
    label: z.string(),
    value: z.number(),
    unit: z.string(),
    ref: z.string(),
  }),
  buyer: z.string(),
  supplierDisplay: z.string(),
  reviewPriority: z.enum(['high', 'medium', 'low']),
});

export const coverHeadline: SceneDescriptor = {
  sceneId: 'CoverHeadline',
  chapter: 'cover',
  schema: CoverHeadlineSchema,
  kinds: {
    kicker: 'presentational',
    headline: 'presentational',
    dek: 'presentational',
    bgVariant: 'presentational',
    'heroStat.label': 'presentational',
    'heroStat.value': 'quant',
    'heroStat.unit': 'bound',
    buyer: 'bound',
    supplierDisplay: 'bound',
    reviewPriority: 'bound',
  },
};
