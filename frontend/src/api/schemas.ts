// MIRROR of backend/src/api/dto.ts (Area 09). Drift = runtime ApiContractError. No file: dep by design.
//
// Looser-than-backend by intent: `audio` is `z.string().optional()` (NOT
// `.url()`) because the API may emit `s3://` URIs which fail Zod's URL check.
// `scenePlan` stays `z.record(z.string(), z.unknown())` — Area 11 owns the
// typed scene-contract parse, not this transport layer.
import { z } from 'zod';

const HeadlineSchema = z.object({
  kicker: z.string(),
  headline: z.string(),
  dek: z.string(),
});

export const SupplierPublicSchema = z.object({
  displayNameEs: z.string(),
  displayNameEn: z.string(),
  isIndividual: z.boolean(),
  // Present only when `!isIndividual` (privacy: never expose a person's id).
  id: z.string().optional(),
});

const BuyerPublicSchema = z.object({ id: z.string(), name: z.string() });

export const InvestigationListItemSchema = z.object({
  caseKey: z.string(),
  buyer: BuyerPublicSchema,
  supplier: SupplierPublicSchema,
  signalFamily: z.string(),
  reviewPriority: z.enum(['high', 'medium', 'low']),
  totalValue: z.number(),
  currency: z.string(),
  timeWindow: z.string().optional(),
  headline: HeadlineSchema,
});

export const InvestigationListResponseSchema = z.object({
  items: z.array(InvestigationListItemSchema),
  page: z.number(),
  pageSize: z.number(),
  total: z.number(),
});

export const InvestigationFullSchema = InvestigationListItemSchema.extend({
  ruleIds: z.array(z.string()),
  // Lang-resolved StoryContent / scene plan — shape varies; Area 11 narrows.
  story: z.record(z.string(), z.unknown()),
  scenePlan: z.record(z.string(), z.unknown()),
  evidence: z.array(z.unknown()),
  // NOT `.url()`: s3:// URIs are valid here.
  audio: z.string().optional(),
  podcastCuePoints: z.array(z.unknown()).optional(),
  updatedAt: z.string(),
});

export const StatsDTOSchema = z.object({
  computedAt: z.string(),
  counters: z.object({
    records: z.number(),
    valueAnalyzed: z.number(),
    entities: z.number(),
    monthsCovered: z.number(),
    investigations: z.number(),
  }),
  methodBreakdown: z.record(z.string(), z.number()),
  byFamily: z.object({
    F1: z.number(),
    F2: z.number(),
    F3: z.number(),
    F4: z.number(),
  }),
  priorityDist: z.object({
    high: z.number(),
    medium: z.number(),
    low: z.number(),
  }),
  trend: z.array(z.unknown()),
  topBuyersByFlaggedValue: z.array(z.unknown()),
});

export const EditionDTOSchema = z.object({
  id: z.string(),
  leadCaseKey: z.string(),
  highlights: z.array(z.unknown()),
  stats: z.unknown(),
  publishedAt: z.string(),
});

export const FiltersDTOSchema = z.object({
  families: z.array(z.string()),
  priorities: z.array(z.string()),
  buyers: z.array(z.object({ id: z.string(), name: z.string() })),
  valueBounds: z.object({ min: z.number(), max: z.number() }),
});

export type SupplierPublic = z.infer<typeof SupplierPublicSchema>;
export type InvestigationListItem = z.infer<typeof InvestigationListItemSchema>;
export type InvestigationListResponse = z.infer<typeof InvestigationListResponseSchema>;
export type InvestigationFull = z.infer<typeof InvestigationFullSchema>;
export type StatsDTO = z.infer<typeof StatsDTOSchema>;
export type EditionDTO = z.infer<typeof EditionDTOSchema>;
export type FiltersDTO = z.infer<typeof FiltersDTOSchema>;

/** Thrown when a server payload fails the frontend-owned mirror schema. */
export class ApiContractError extends Error {
  readonly endpoint: string;
  readonly issues: z.ZodIssue[];

  constructor(endpoint: string, issues: z.ZodIssue[]) {
    super(
      `API contract violation at ${endpoint}: ${issues
        .map((i) => `${i.path.join('.') || '(root)'} ${i.message}`)
        .join('; ')}`,
    );
    this.name = 'ApiContractError';
    this.endpoint = endpoint;
    this.issues = issues;
  }
}
