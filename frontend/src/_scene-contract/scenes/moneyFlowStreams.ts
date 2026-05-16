import { z } from 'zod';
import type { SceneDescriptor } from '../types.js';

const MoneyFlowStreamsSchema = z.object({
  buyer: z.string(),
  totalValue: z.number(),
  totalRef: z.string(),
  streams: z
    .array(
      z.object({
        supplierId: z.string(),
        supplierDisplay: z.string(),
        amount: z.number(),
        amountRef: z.string(),
        share: z.number(),
        shareRef: z.string(),
      }),
    )
    .min(1),
  emphasisSupplierId: z.string(),
  caption: z.string(),
});

export const moneyFlowStreams: SceneDescriptor = {
  sceneId: 'MoneyFlowStreams',
  chapter: 'sigueElDinero',
  schema: MoneyFlowStreamsSchema,
  kinds: {
    buyer: 'bound',
    totalValue: 'quant',
    totalRef: 'quant',
    'streams[].supplierId': 'bound',
    'streams[].supplierDisplay': 'bound',
    'streams[].amount': 'quant',
    'streams[].amountRef': 'quant',
    'streams[].share': 'quant',
    'streams[].shareRef': 'quant',
    emphasisSupplierId: 'presentational',
    caption: 'presentational',
  },
};
