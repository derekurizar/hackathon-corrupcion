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
  RUN_BENCHMARKS: boolEnv(true),
  RUN_DETECTION: boolEnv(true),
  RUN_STORY: boolEnv(true),
  RUN_AUDIO: boolEnv(true),
  RUN_PUBLISH: boolEnv(true),
  OPUS_LEAD: boolEnv(false),
  INGEST_ONLY: boolEnv(false),
  BRAND_NAME: z.string().default('Expediente Público'),
  BRAND_TAGLINE: z.string().default(''),
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
