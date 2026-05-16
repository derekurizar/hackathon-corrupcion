import { z } from 'zod';
import type { SceneDescriptor } from '../types.js';

// Variant of MoneyFlowStreams (sigueElDinero): F3 15 / F4 18 — LCE Q90k/Q900k bands.
const ThresholdLadderSchema = z.object({
  buyer: z.string(),
  bands: z
    .array(
      z.object({
        label: z.string(),
        ceiling: z.number(),
      }),
    )
    .min(1),
  awards: z
    .array(
      z.object({
        value: z.number(),
        valueRef: z.string(),
        bandLabel: z.string(),
      }),
    )
    .min(1),
  caption: z.string(),
});

export const thresholdLadder: SceneDescriptor = {
  sceneId: 'ThresholdLadder',
  chapter: 'sigueElDinero',
  schema: ThresholdLadderSchema,
  kinds: {
    buyer: 'bound',
    'bands[].label': 'bound',
    'bands[].ceiling': 'bound',
    'awards[].value': 'quant',
    'awards[].valueRef': 'quant',
    'awards[].bandLabel': 'presentational',
    caption: 'presentational',
  },
};
