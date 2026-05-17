import { z } from 'zod';
import type { SceneDescriptor } from '../types.js';

const ConcentrationFanSchema = z.object({
  buyer: z.string(),
  topShare: z.number(),
  topShareRef: z.string(),
  suppliers: z
    .array(
      z.object({
        supplierId: z.string(),
        supplierDisplay: z.string(),
        value: z.number(),
        valueRef: z.string(),
        share: z.number(),
        shareRef: z.string(),
        flagged: z.boolean(),
      }),
    )
    .min(1),
  caption: z.string(),
  narration: z.string(),
});

export const concentrationFan: SceneDescriptor = {
  sceneId: 'ConcentrationFan',
  chapter: 'lasConexiones',
  schema: ConcentrationFanSchema,
  kinds: {
    buyer: 'bound',
    topShare: 'quant',
    topShareRef: 'quant',
    'suppliers[].supplierId': 'bound',
    'suppliers[].supplierDisplay': 'bound',
    'suppliers[].value': 'quant',
    'suppliers[].valueRef': 'quant',
    'suppliers[].share': 'quant',
    'suppliers[].shareRef': 'quant',
    'suppliers[].flagged': 'bound',
    caption: 'presentational',
    narration: 'presentational',
  },
};
