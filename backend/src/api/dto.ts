import { z } from 'zod';
import { DashboardStatsSchema, EditionSchema } from '../schema/index.js';

/**
 * Public response DTO contracts for Area 09. This module is the canonical
 * contract source; the SPA (Area 10) declares its own mirrored Zod schemas and
 * does NOT import this file. DTOs deliberately exclude internal fields
 * (`signalIds`, `evidenceHash`, `version`, `status`) — see `project.assertNoLeak`.
 */

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
  // Stored Investigation.timeWindow is a single string label (Area 03 shape).
  timeWindow: z.string().optional(),
  // Lang-resolved cover.
  headline: HeadlineSchema,
});

export const InvestigationFullSchema = InvestigationListItemSchema.extend({
  ruleIds: z.array(z.string()),
  // Lang-resolved StoryContent (es OR en object), shape varies by lang.
  story: z.record(z.string(), z.unknown()),
  scenePlan: z.record(z.string(), z.unknown()),
  evidence: z.array(z.unknown()),
  // Lang-resolved audio URL — site-relative CloudFront path (e.g. /audio/<case>/<v>/es.mp3).
  audio: z.string().optional(),
  podcastCuePoints: z.array(z.unknown()).optional(),
  updatedAt: z.string(),
});

// Public dashboard shape — drop the internal `_id: 'current'` discriminator.
export const StatsDTOSchema = DashboardStatsSchema.omit({ _id: true });

// Edition: drop internal `_id`, expose the stringified key as `id`.
export const EditionDTOSchema = EditionSchema.omit({ _id: true }).extend({
  id: z.string(),
});

export const FiltersDTOSchema = z.object({
  families: z.array(z.string()),
  priorities: z.array(z.string()),
  buyers: z.array(z.object({ id: z.string(), name: z.string() })),
  valueBounds: z.object({ min: z.number(), max: z.number() }),
});

export type SupplierPublic = z.infer<typeof SupplierPublicSchema>;
export type InvestigationListItem = z.infer<typeof InvestigationListItemSchema>;
export type InvestigationFull = z.infer<typeof InvestigationFullSchema>;
export type StatsDTO = z.infer<typeof StatsDTOSchema>;
export type EditionDTO = z.infer<typeof EditionDTOSchema>;
export type FiltersDTO = z.infer<typeof FiltersDTOSchema>;
