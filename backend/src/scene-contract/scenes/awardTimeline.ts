import { z } from 'zod';
import type { SceneDescriptor } from '../types.js';

const AwardTimelineSchema = z.object({
  events: z
    .array(
      z.object({
        date: z.string(),
        kind: z.enum(['published', 'tenderClose', 'award', 'contractSigned']),
        label: z.string(),
        valueRef: z.string().optional(),
      }),
    )
    .min(1),
  missingStages: z.array(z.string()),
  highlightIdx: z.number().int(),
  caption: z.string(),
});

export const awardTimeline: SceneDescriptor = {
  sceneId: 'AwardTimeline',
  chapter: 'cronologia',
  schema: AwardTimelineSchema,
  kinds: {
    'events[].date': 'bound',
    'events[].kind': 'bound',
    'events[].label': 'presentational',
    'events[].valueRef': 'quant',
    'missingStages[]': 'bound',
    highlightIdx: 'presentational',
    caption: 'presentational',
  },
};
