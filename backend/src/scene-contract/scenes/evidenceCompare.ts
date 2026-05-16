import { z } from 'zod';
import type { SceneDescriptor } from '../types.js';

// Variant of EvidenceLedger (evidencia): benchmarks present — side-by-side compare.
const EvidenceCompareSchema = z.object({
  rows: z
    .array(
      z.object({
        field: z.string(),
        value: z.unknown(),
        benchmark: z.unknown(),
        comparison: z.string().optional(),
      }),
    )
    .min(1),
  rowCaptions: z.array(z.string()),
  caption: z.string(),
});

export const evidenceCompare: SceneDescriptor = {
  sceneId: 'EvidenceCompare',
  chapter: 'evidencia',
  schema: EvidenceCompareSchema,
  kinds: {
    'rows[].field': 'bound',
    'rows[].value': 'bound',
    'rows[].benchmark': 'bound',
    'rows[].comparison': 'bound',
    'rowCaptions[]': 'presentational',
    caption: 'presentational',
  },
};
