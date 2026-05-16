import { z } from 'zod';

// evidence.value and evidence.benchmark are z.unknown() — deferred to Area 05
export const EvidenceItemSchema = z.object({
  field: z.string(),
  value: z.unknown(),
  comparison: z.string().optional(),
  benchmark: z.unknown().optional(),
});

export const SignalSchema = z.object({
  _id: z.string(),
  ocid: z.string(),
  caseKey: z.string(),
  rule_id: z.string(),
  family: z.enum(['F1', 'F2', 'F3', 'F4']),
  severity: z.enum(['low', 'medium', 'high']),
  confidence: z.number(),
  primaryEntityId: z.string(),
  secondaryEntityIds: z.array(z.string()),
  timeWindow: z.string(),
  title: z.string(),
  explanation: z.string(),
  story_angle: z.string(),
  evidence: z.array(EvidenceItemSchema),
});

export type EvidenceItem = z.infer<typeof EvidenceItemSchema>;
export type Signal = z.infer<typeof SignalSchema>;
