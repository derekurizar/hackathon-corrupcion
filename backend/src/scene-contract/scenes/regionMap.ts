import { z } from 'zod';
import type { SceneDescriptor } from '../types.js';

// Variant of MoneyFlowStreams (sigueElDinero): STRETCH — geo distribution.
const RegionMapSchema = z.object({
  buyer: z.string(),
  regions: z
    .array(
      z.object({
        region: z.string(),
        value: z.number(),
        valueRef: z.string(),
      }),
    )
    .min(1),
  caption: z.string(),
});

export const regionMap: SceneDescriptor = {
  sceneId: 'RegionMap',
  chapter: 'sigueElDinero',
  schema: RegionMapSchema,
  kinds: {
    buyer: 'bound',
    'regions[].region': 'bound',
    'regions[].value': 'quant',
    'regions[].valueRef': 'quant',
    caption: 'presentational',
  },
};
