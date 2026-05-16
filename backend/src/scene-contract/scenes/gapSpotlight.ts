import { z } from 'zod';
import type { SceneDescriptor } from '../types.js';

// Variant of AwardTimeline (cronologia): F4 20/21 — short tender / fast award.
const GapSpotlightSchema = z.object({
  events: z
    .array(
      z.object({
        date: z.string(),
        kind: z.enum(['published', 'tenderClose', 'award', 'contractSigned']),
        label: z.string(),
      }),
    )
    .min(1),
  gapDays: z.number(),
  gapDaysRef: z.string(),
  spotlightLabel: z.string(),
  caption: z.string(),
});

export const gapSpotlight: SceneDescriptor = {
  sceneId: 'GapSpotlight',
  chapter: 'cronologia',
  schema: GapSpotlightSchema,
  kinds: {
    'events[].date': 'bound',
    'events[].kind': 'bound',
    'events[].label': 'presentational',
    gapDays: 'quant',
    gapDaysRef: 'quant',
    spotlightLabel: 'presentational',
    caption: 'presentational',
  },
};
