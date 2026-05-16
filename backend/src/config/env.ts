import { z } from 'zod';

/**
 * Boolean env var coercion — treats "true"/"1" (case-insensitive) as true,
 * everything else (including "false", "0", "", undefined) as the provided default.
 * NOTE: z.coerce.boolean() is NOT used — it converts any non-empty string to true,
 * which would make "false" → true (wrong).
 */
function boolEnv(defaultValue: boolean) {
  return z.preprocess(
    (v) =>
      typeof v === 'string'
        ? ['true', '1'].includes(v.toLowerCase())
        : v === undefined
          ? defaultValue
          : v,
    z.boolean().default(defaultValue),
  );
}

const EnvSchema = z.object({
  MONGODB_URI: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().optional(),
  ELEVENLABS_API_KEY: z.string().optional(),
  ELEVENLABS_VOICE_ES: z.string().optional(),
  ELEVENLABS_VOICE_EN: z.string().optional(),
  MAX_INVESTIGATIONS_PER_RUN: z.coerce.number().int().default(20),
  // Generation prompt digest — bound the per-case evidence sent to the LLM.
  EVIDENCE_SAMPLE_PER_RULE: z.coerce.number().int().default(6),
  MAX_REPRESENTATIVE_EVIDENCE: z.coerce.number().int().default(60),
  // Floor for the evidence array persisted on each Investigation. A "case" can
  // hold 60k+ flattened items (≈17 MB → BSON serialization overflow). We store
  // a locked-order prefix instead; the cap grows only if a scenePlan ref needs
  // a higher index, so every persisted ev:<i> still resolves on the SPA.
  MAX_PERSISTED_EVIDENCE: z.coerce.number().int().default(300),
  // Per-rule cap on signals fed to scene derivation + persisted on the doc.
  // `deriveFromEvidence` flattens every signal's evidence, so an uncapped case
  // (60k+ signals) produces a multi-MB scenePlan that also overflows BSON.
  MAX_SCENE_SIGNALS_PER_RULE: z.coerce.number().int().default(8),
  RUN_BENCHMARKS: boolEnv(true),
  RUN_DETECTION: boolEnv(true),
  RUN_STORY: boolEnv(true),
  RUN_AUDIO: boolEnv(true),
  RUN_PUBLISH: boolEnv(true),
  OPUS_LEAD: boolEnv(false),
  INGEST_ONLY: boolEnv(false),
  BRAND_NAME: z.string().default('Expediente Público'),
  BRAND_TAGLINE: z.string().default(''),
  // Logging — kept lenient (a logging typo must never break the pipeline).
  // The logger module reads these from process.env directly; declared here
  // for documentation/validation only.
  LOG_LEVEL: z.string().optional(),
  LOG_DIR: z.string().optional(),
  // Dump each validated Investigation to disk before the MongoDB upsert.
  PUBLISH_ARTIFACTS: boolEnv(true),
});

export type Config = z.infer<typeof EnvSchema>;

export function loadConfig(): Config {
  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    const messages = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Configuration error — missing or invalid environment variables:\n${messages}`);
  }
  return result.data;
}
