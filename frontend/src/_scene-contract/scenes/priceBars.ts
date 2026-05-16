import { z } from 'zod';
import type { SceneDescriptor } from '../types.js';

// Variant of MoneyFlowStreams (sigueElDinero): F3 rules 13/14 — price vs benchmark.
const PriceBarsSchema = z.object({
  buyer: z.string(),
  category: z.string(),
  bars: z
    .array(
      z.object({
        label: z.string(),
        value: z.number(),
        valueRef: z.string(),
        flagged: z.boolean(),
      }),
    )
    .min(1),
  benchmarkValue: z.number(),
  benchmarkRef: z.string(),
  caption: z.string(),
});

export const priceBars: SceneDescriptor = {
  sceneId: 'PriceBars',
  chapter: 'sigueElDinero',
  schema: PriceBarsSchema,
  kinds: {
    buyer: 'bound',
    category: 'bound',
    'bars[].label': 'presentational',
    'bars[].value': 'quant',
    'bars[].valueRef': 'quant',
    'bars[].flagged': 'bound',
    benchmarkValue: 'quant',
    benchmarkRef: 'quant',
    caption: 'presentational',
  },
};
