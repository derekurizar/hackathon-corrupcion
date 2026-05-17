import Anthropic from '@anthropic-ai/sdk';
import { moduleLogger } from '../obs/logger.js';
import { loadConfig } from '../config/env.js';
import type { StoryContentEs, StoryContentEn, CuePoint } from '../schema/index.js';

export interface ClaudeStoryRaw {
  es: StoryContentEs;
  en: StoryContentEn;
  podcast: {
    es: { script: string; cuePoints: CuePoint[] };
    en: { script: string; cuePoints: CuePoint[] };
  };
  scenePlan: Record<string, { sceneId: string; params: Record<string, unknown> }>;
}

/** Thrown on JSON parse failure or a structurally bad Claude response. The
 * guardrails layer catches this and routes to the deterministic fallback. */
export class ClaudeParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ClaudeParseError';
  }
}

export interface ClaudeClient {
  generateStory(opts: {
    systemPrefix: string;
    userBlock: string;
    isLead: boolean;
    stricter?: boolean;
  }): Promise<ClaudeStoryRaw>;
}

const log = moduleLogger('claude');

/**
 * Structured-outputs envelope schema (Anthropic `output_config.format`, GA —
 * constrained decoding guarantees the response is valid JSON in this shape).
 * Prose fields are free-text `string`s; per-scene `params` are intentionally
 * an open object (polymorphic per sceneId — the Zod scene schema still gates
 * shape downstream). This kills the "invalid JSON / missing es|en|podcast|
 * scenePlan" parse failures; if the API ever rejects the schema we degrade
 * gracefully (see `structuredOk`).
 */
const STR = { type: 'string' } as const;
const SCENE_ENTRY = {
  type: 'object',
  additionalProperties: false,
  required: ['sceneId', 'params'],
  properties: { sceneId: STR, params: { type: 'object', additionalProperties: true } },
} as const;
const CUEPOINTS = {
  type: 'array',
  items: {
    type: 'object',
    additionalProperties: false,
    required: ['chapter', 'tSec'],
    properties: { chapter: STR, tSec: { type: 'number' } },
  },
} as const;
const PODCAST_LANG = {
  type: 'object',
  additionalProperties: false,
  required: ['script', 'cuePoints'],
  properties: { script: STR, cuePoints: CUEPOINTS },
} as const;
const SCENE_CHAPTERS = [
  'cover',
  'elCaso',
  'sigueElDinero',
  'lasConexiones',
  'evidencia',
  'cronologia',
  'cierre',
] as const;
const STORY_OUTPUT_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  required: ['es', 'en', 'podcast', 'scenePlan'],
  properties: {
    es: {
      type: 'object',
      additionalProperties: false,
      required: [
        'cover',
        'elCaso',
        'sigueElDinero',
        'lasConexiones',
        'cronologia',
        'cierre',
        'keyFindings',
      ],
      properties: {
        cover: {
          type: 'object',
          additionalProperties: false,
          required: ['kicker', 'headline', 'dek'],
          properties: { kicker: STR, headline: STR, dek: STR },
        },
        elCaso: STR,
        sigueElDinero: STR,
        lasConexiones: STR,
        cronologia: STR,
        cierre: {
          type: 'object',
          additionalProperties: false,
          required: ['queSignificaYQueNo', 'caveat'],
          properties: { queSignificaYQueNo: STR, caveat: STR },
        },
        keyFindings: { type: 'array', items: STR },
      },
    },
    en: {
      type: 'object',
      additionalProperties: false,
      required: [
        'cover',
        'theCase',
        'followTheMoney',
        'theConnections',
        'timeline',
        'closing',
        'keyFindings',
      ],
      properties: {
        cover: {
          type: 'object',
          additionalProperties: false,
          required: ['kicker', 'headline', 'dek'],
          properties: { kicker: STR, headline: STR, dek: STR },
        },
        theCase: STR,
        followTheMoney: STR,
        theConnections: STR,
        timeline: STR,
        closing: {
          type: 'object',
          additionalProperties: false,
          required: ['whatItMeans', 'caveat'],
          properties: { whatItMeans: STR, caveat: STR },
        },
        keyFindings: { type: 'array', items: STR },
      },
    },
    podcast: {
      type: 'object',
      additionalProperties: false,
      required: ['es', 'en'],
      properties: { es: PODCAST_LANG, en: PODCAST_LANG },
    },
    scenePlan: {
      type: 'object',
      additionalProperties: false,
      required: [...SCENE_CHAPTERS],
      properties: Object.fromEntries(SCENE_CHAPTERS.map((c) => [c, SCENE_ENTRY])),
    },
  },
};

/** Best-effort caseKey for logging only (userBlock starts `CASE <key> — ...`). */
function caseKeyForLog(userBlock: string): string {
  const m = /CASE\s+(\S+)/.exec(userBlock);
  return m?.[1] ?? 'unknown';
}

const RETRY_DELAYS_MS = [1000, 2000, 4000] as const;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isRateLimit(err: unknown): boolean {
  if (err && typeof err === 'object') {
    const status = (err as { status?: number }).status;
    if (status === 429) return true;
    const name = (err as { name?: string }).name ?? '';
    if (/rate.?limit/i.test(name)) return true;
    const msg = (err as { message?: string }).message ?? '';
    if (/rate.?limit|429/i.test(msg)) return true;
  }
  return false;
}

/** Minimal structural guard before we hand to the deeper guardrail checks. */
function looksLikeStory(v: unknown): v is ClaudeStoryRaw {
  if (v === null || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o['es'] === 'object' &&
    o['es'] !== null &&
    typeof o['en'] === 'object' &&
    o['en'] !== null &&
    typeof o['podcast'] === 'object' &&
    o['podcast'] !== null &&
    typeof o['scenePlan'] === 'object' &&
    o['scenePlan'] !== null
  );
}

/**
 * Anthropic Messages client (idea/04 §"Claude story generation"). Model is
 * `claude-sonnet-4-6` by default; the off-by-default `OPUS_LEAD` toggle routes
 * the single lead investigation to `claude-opus-4-7`. The system prefix is
 * sent as a cached content block (prompt caching); 429/rate-limit is retried
 * with exponential backoff + jitter. A bad/non-JSON response throws
 * `ClaudeParseError` (the guardrails layer catches it → fallback).
 */
export function createClaudeClient(): ClaudeClient {
  const cfg = loadConfig();
  const apiKey = cfg.ANTHROPIC_API_KEY ?? '';
  if (apiKey === '') {
    throw new Error('ANTHROPIC_API_KEY is required for story generation');
  }
  const anthropic = new Anthropic({ apiKey });
  // Structured outputs on by default; auto-disabled for the rest of the
  // process if the API ever rejects the schema (400) — graceful degradation
  // to the prior free-text + JSON.parse behavior, so this never regresses.
  let structuredOk = true;

  return {
    async generateStory(opts): Promise<ClaudeStoryRaw> {
      const model = cfg.OPUS_LEAD && opts.isLead ? 'claude-opus-4-7' : 'claude-sonnet-4-6';
      const userBlock = opts.stricter
        ? `STRICT MODE: Previous response failed guardrails. ${opts.userBlock}`
        : opts.userBlock;

      const caseKey = caseKeyForLog(opts.userBlock);
      let lastErr: unknown;
      for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
        try {
          log(
            `generating case=${caseKey} model=${model} ` +
              `isLead=${opts.isLead} attempt=${attempt + 1}`,
          );

          const response = await anthropic.messages.create({
            model,
            max_tokens: 16384,
            system: [
              {
                type: 'text',
                text: opts.systemPrefix,
                cache_control: { type: 'ephemeral' },
              },
            ],
            messages: [{ role: 'user', content: userBlock }],
            ...(structuredOk
              ? {
                  output_config: {
                    format: { type: 'json_schema' as const, schema: STORY_OUTPUT_SCHEMA },
                  },
                }
              : {}),
          });

          const block = response.content[0];
          if (block === undefined || block.type !== 'text') {
            log(
              `parse_error case=${caseKey} attempt=${attempt + 1} ` +
                `reason="no text block" preview=""`,
            );
            throw new ClaudeParseError('Claude response had no text block');
          }
          let parsed: unknown;
          try {
            parsed = JSON.parse(block.text);
          } catch {
            log(
              `parse_error case=${caseKey} attempt=${attempt + 1} ` +
                `reason="invalid JSON" preview="${block.text.slice(0, 120)}"`,
            );
            throw new ClaudeParseError('Claude response was not valid JSON');
          }
          if (!looksLikeStory(parsed)) {
            log(
              `parse_error case=${caseKey} attempt=${attempt + 1} ` +
                `reason="missing es/en/podcast/scenePlan" ` +
                `preview="${block.text.slice(0, 120)}"`,
            );
            throw new ClaudeParseError('Claude response missing es/en/podcast/scenePlan');
          }
          log(
            `done case=${caseKey} attempt=${attempt + 1} ` +
              `input_tokens=${response.usage.input_tokens} ` +
              `output_tokens=${response.usage.output_tokens} ` +
              `cached_tokens=${response.usage.cache_read_input_tokens ?? 0}`,
          );
          return parsed;
        } catch (err) {
          console.error(err);
          if (err instanceof ClaudeParseError) throw err;
          // Graceful degradation: a 400 while structured outputs are on is
          // almost certainly the schema — disable it and retry this same
          // attempt as free-text JSON (never regress below prior behavior).
          const reqStatus = (err as { status?: number }).status;
          if (structuredOk && reqStatus === 400) {
            structuredOk = false;
            log(
              `structured_output_disabled case=${caseKey} attempt=${attempt + 1} ` +
                `reason="400 — retrying without output_config"`,
            );
            attempt -= 1;
            continue;
          }
          if (isRateLimit(err) && attempt < RETRY_DELAYS_MS.length) {
            lastErr = err;
            const base = RETRY_DELAYS_MS[attempt]!;
            const delay = base + Math.random() * 500;
            log(
              `rate_limited case=${caseKey} attempt=${attempt + 1} ` +
                `retrying in ${Math.round(delay)}ms`,
            );
            await sleep(delay);
            continue;
          } else {
            // Non-rate-limit API error — log the actual service response
            const status = (err as { status?: number }).status;
            const message = err instanceof Error ? err.message : String(err);
            log(
              `api_error case=${caseKey} attempt=${attempt + 1}` +
                (status !== undefined ? ` status=${status}` : '') +
                ` message="${message.slice(0, 200)}"`,
            );
            lastErr = err;
          }
          throw err;
        }
      }
      const finalMessage = lastErr instanceof Error ? lastErr.message : String(lastErr);
      log(
        `failed case=${caseKey} all_attempts_exhausted ` +
          `message="${finalMessage.slice(0, 200)}"`,
      );
      throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
    },
  };
}
