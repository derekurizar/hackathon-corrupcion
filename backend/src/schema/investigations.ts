import { z } from 'zod';

const CoverSchema = z.object({ kicker: z.string(), headline: z.string(), dek: z.string() });
const CuePointSchema = z.object({ chapter: z.string(), tSec: z.number() });

// scenePlan.params permissive — Area 06 tightens these to the scene-contract schema
const ScenePlanEntrySchema = z.object({
  sceneId: z.string(),
  params: z.record(z.string(), z.unknown()),
  source: z.enum(['llm', 'fallback']),
});

// ES story fields
const StoryContentEsSchema = z.object({
  cover: CoverSchema,
  elCaso: z.string(),
  sigueElDinero: z.string(),
  lasConexiones: z.string(),
  cronologia: z.string(),
  cierre: z.object({ queSignificaYQueNo: z.string(), caveat: z.string() }),
  keyFindings: z.array(z.string()),
});

// EN story fields (different field names)
const StoryContentEnSchema = z.object({
  cover: CoverSchema,
  theCase: z.string(),
  followTheMoney: z.string(),
  theConnections: z.string(),
  timeline: z.string(),
  closing: z.object({ whatItMeans: z.string(), caveat: z.string() }),
  keyFindings: z.array(z.string()),
});

export const InvestigationSchema = z.object({
  _id: z.string(),
  buyer: z.object({ id: z.string(), name: z.string() }),
  supplier: z.object({
    id: z.string(),
    displayNameEs: z.string(),
    displayNameEn: z.string(),
    isIndividual: z.boolean(),
  }),
  signalFamily: z.enum(['F1', 'F2', 'F3', 'F4']),
  timeWindow: z.string(),
  reviewPriority: z.enum(['high', 'medium', 'low']),
  ruleIds: z.array(z.string()),
  signalIds: z.array(z.string()),
  totalValue: z.number(),
  currency: z.string(),
  es: StoryContentEsSchema,
  en: StoryContentEnSchema,
  // scenePlan permissive — Area 06 validates params against scene-contract
  scenePlan: z.record(z.string(), ScenePlanEntrySchema),
  // evidence permissive — Area 05/07 tighten this
  evidence: z.array(z.unknown()),
  audio: z.object({ es: z.string(), en: z.string() }).optional(),
  podcastCuePoints: z
    .object({
      es: z.array(CuePointSchema),
      en: z.array(CuePointSchema),
    })
    .optional(),
  evidenceHash: z.string(),
  version: z.number().int(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type CuePoint = z.infer<typeof CuePointSchema>;
export type ScenePlanEntry = z.infer<typeof ScenePlanEntrySchema>;
export type StoryContentEs = z.infer<typeof StoryContentEsSchema>;
export type StoryContentEn = z.infer<typeof StoryContentEnSchema>;
export type Investigation = z.infer<typeof InvestigationSchema>;
