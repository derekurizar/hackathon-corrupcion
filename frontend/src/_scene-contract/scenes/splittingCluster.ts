import { z } from 'zod';
import type { SceneDescriptor } from '../types.js';

// Variant of ConcentrationFan (lasConexiones): F4 18 — contract splitting cluster.
const SplittingClusterSchema = z.object({
  buyer: z.string(),
  supplierId: z.string(),
  supplierDisplay: z.string(),
  awards: z
    .array(
      z.object({
        date: z.string(),
        value: z.number(),
        valueRef: z.string(),
      }),
    )
    .min(1),
  clusterSum: z.number(),
  clusterSumRef: z.string(),
  caption: z.string(),
});

export const splittingCluster: SceneDescriptor = {
  sceneId: 'SplittingCluster',
  chapter: 'lasConexiones',
  schema: SplittingClusterSchema,
  kinds: {
    buyer: 'bound',
    supplierId: 'bound',
    supplierDisplay: 'bound',
    'awards[].date': 'bound',
    'awards[].value': 'quant',
    'awards[].valueRef': 'quant',
    clusterSum: 'quant',
    clusterSumRef: 'quant',
    caption: 'presentational',
  },
};
