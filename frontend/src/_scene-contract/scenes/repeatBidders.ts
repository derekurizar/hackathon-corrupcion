import { z } from 'zod';
import type { SceneDescriptor } from '../types.js';

// Variant of ConcentrationFan (lasConexiones): F2 10 — repeat winner / same competitors.
const RepeatBiddersSchema = z.object({
  buyer: z.string(),
  bidders: z
    .array(
      z.object({
        bidderId: z.string(),
        bidderDisplay: z.string(),
        appearances: z.number().int(),
        appearancesRef: z.string(),
        wins: z.number().int(),
        winsRef: z.string(),
      }),
    )
    .min(1),
  caption: z.string(),
});

export const repeatBidders: SceneDescriptor = {
  sceneId: 'RepeatBidders',
  chapter: 'lasConexiones',
  schema: RepeatBiddersSchema,
  kinds: {
    buyer: 'bound',
    'bidders[].bidderId': 'bound',
    'bidders[].bidderDisplay': 'bound',
    'bidders[].appearances': 'quant',
    'bidders[].appearancesRef': 'quant',
    'bidders[].wins': 'quant',
    'bidders[].winsRef': 'quant',
    caption: 'presentational',
  },
};
