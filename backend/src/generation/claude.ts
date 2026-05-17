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

/** One scene whose LLM params failed the Zod scene schema. */
export interface SceneZodFailure {
  chapter: string;
  sceneId: string;
  params: Record<string, unknown>;
  /** Formatted Zod issues (`path: message`). */
  issues: string[];
  /** Expected param paths (from the scene descriptor `kinds`). */
  expectedFields: string[];
}

export interface ClaudeClient {
  generateStory(opts: {
    systemPrefix: string;
    userBlock: string;
    isLead: boolean;
    stricter?: boolean;
  }): Promise<ClaudeStoryRaw>;
  /**
   * Targeted repair: given scenes whose params failed schema validation plus
   * the exact Zod issues, ask the model to return corrected params for ONLY
   * those scenes (fixing just the broken fields, preserving prose). Returns a
   * chapter → { sceneId, params } map of the model's corrections. Never
   * throws — on any error returns `{}` (caller keeps the deterministic
   * fallback).
   */
  repairScenes(opts: {
    caseKey: string;
    failures: SceneZodFailure[];
  }): Promise<Record<string, { sceneId: string; params: Record<string, unknown> }>>;
}

const log = moduleLogger('claude');

/**
 * Forced-tool-use envelope schema. We bind the response to a single tool the
 * model is forced to call (`tool_choice: { type:'tool' }`); the SDK returns
 * the already-parsed JSON object as the `tool_use` block's `input`. We use a
 * TOOL (not `output_config` structured outputs) on purpose: structured
 * outputs' strict grammar forbids open objects (`additionalProperties` must
 * be `false`, every key enumerated), but per-scene `params` are polymorphic
 * (different shape per sceneId) — impossible to enumerate. Tool input
 * schemas do NOT carry that restriction, so `params` stays an open object
 * while the prose envelope is still strongly shaped. This kills the
 * "invalid JSON / missing es|en|podcast|scenePlan" failures; if the API ever
 * rejects the tool we degrade gracefully to free-text + JSON.parse (see
 * `toolModeOk`).
 */
const STR = { type: 'string' } as const;
const SCENE_ENTRY = {
  type: 'object',
  additionalProperties: false,
  required: ['sceneId', 'params'],
  // `params` is polymorphic per sceneId — an open object the Zod scene
  // schema gates downstream (allowed in tool input schemas).
  properties: { sceneId: STR, params: { type: 'object' } },
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

/** The single tool the model is forced to call to emit the story envelope. */
const STORY_TOOL = {
  name: 'emit_story',
  description:
    'Emit the complete bilingual investigation story. Call this tool exactly ' +
    'once with the full es/en/podcast/scenePlan object — this IS the response.',
  input_schema: STORY_OUTPUT_SCHEMA as Anthropic.Tool.InputSchema,
} as const satisfies Anthropic.Tool;

/** Tool the model is forced to call to return corrected scene params. */
const FIX_SCENES_TOOL = {
  name: 'fix_scenes',
  description:
    'Return corrected params for each listed scene so they satisfy the ' +
    'scene schema. Fix ONLY what the reported errors require; preserve all ' +
    'other content (especially prose/narration). Keep the same sceneId.',
  input_schema: {
    type: 'object',
    additionalProperties: false,
    required: ['scenes'],
    properties: {
      scenes: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['chapter', 'sceneId', 'params'],
          properties: { chapter: STR, sceneId: STR, params: { type: 'object' } },
        },
      },
    },
  } as Anthropic.Tool.InputSchema,
} as const satisfies Anthropic.Tool;

const FIX_SCENES_SYSTEM =
  'You repair JSON params for data-visualization scenes in a public-procurement ' +
  'newsroom article. Each item below has a sceneId, the params that FAILED ' +
  'schema validation, the exact validation errors, and the expected param ' +
  'fields. Return, via the fix_scenes tool, corrected params for every item — ' +
  'change ONLY what the errors require (fix enum/type/shape/missing-field ' +
  'issues), keep the same sceneId, and preserve every prose/narration string ' +
  'verbatim. Never invent figures, names, dates or statistics.';

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
  // Forced tool use on by default; auto-disabled for the rest of the process
  // if the API ever rejects the tool (400) — graceful degradation to the
  // prior free-text + JSON.parse behavior, so this never regresses.
  let toolModeOk = true;

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
            ...(toolModeOk
              ? {
                  tools: [STORY_TOOL],
                  tool_choice: {
                    type: 'tool' as const,
                    name: STORY_TOOL.name,
                    disable_parallel_tool_use: true,
                  },
                }
              : {}),
          });

          let parsed: unknown;
          if (toolModeOk) {
            // Forced tool use: the story is the tool_use block's `input`,
            // already parsed by the SDK (no JSON.parse needed).
            const tu = response.content.find((b) => b.type === 'tool_use');
            if (tu === undefined || tu.type !== 'tool_use') {
              log(
                `parse_error case=${caseKey} attempt=${attempt + 1} ` +
                  `reason="no tool_use block"`,
              );
              throw new ClaudeParseError('Claude response had no tool_use block');
            }
            parsed = tu.input;
          } else {
            const block = response.content.find((b) => b.type === 'text');
            if (block === undefined || block.type !== 'text') {
              log(
                `parse_error case=${caseKey} attempt=${attempt + 1} ` +
                  `reason="no text block" preview=""`,
              );
              throw new ClaudeParseError('Claude response had no text block');
            }
            try {
              parsed = JSON.parse(block.text);
            } catch {
              log(
                `parse_error case=${caseKey} attempt=${attempt + 1} ` +
                  `reason="invalid JSON" preview="${block.text.slice(0, 120)}"`,
              );
              throw new ClaudeParseError('Claude response was not valid JSON');
            }
          }
          if (!looksLikeStory(parsed)) {
            log(
              `parse_error case=${caseKey} attempt=${attempt + 1} ` +
                `reason="missing es/en/podcast/scenePlan"`,
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
          // Graceful degradation: a 400 while forced tool use is on is
          // almost certainly the tool schema — disable it and retry this
          // same attempt as free-text JSON (never regress below prior
          // behavior).
          const reqStatus = (err as { status?: number }).status;
          if (toolModeOk && reqStatus === 400) {
            toolModeOk = false;
            log(
              `tool_mode_disabled case=${caseKey} attempt=${attempt + 1} ` +
                `reason="400 — retrying without forced tool use"`,
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

    async repairScenes(opts): Promise<
      Record<string, { sceneId: string; params: Record<string, unknown> }>
    > {
      const { caseKey, failures } = opts;
      if (failures.length === 0) return {};
      const userContent =
        'Fix these scenes. Return corrected params for ALL of them via the ' +
        'fix_scenes tool.\n\n' +
        JSON.stringify(
          failures.map((f) => ({
            chapter: f.chapter,
            sceneId: f.sceneId,
            expectedFields: f.expectedFields,
            validationErrors: f.issues,
            failedParams: f.params,
          })),
          null,
          2,
        );
      log(
        `repair generating case=${caseKey} ` +
          `chapters=${failures.map((f) => f.chapter).join(',')}`,
      );
      try {
        const response = await anthropic.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 8192,
          system: [{ type: 'text', text: FIX_SCENES_SYSTEM }],
          messages: [{ role: 'user', content: userContent }],
          tools: [FIX_SCENES_TOOL],
          tool_choice: {
            type: 'tool',
            name: FIX_SCENES_TOOL.name,
            disable_parallel_tool_use: true,
          },
        });
        const tu = response.content.find((b) => b.type === 'tool_use');
        if (tu === undefined || tu.type !== 'tool_use') {
          log(`repair_parse_error case=${caseKey} reason="no tool_use block"`);
          return {};
        }
        const input = tu.input as {
          scenes?: Array<{ chapter?: unknown; sceneId?: unknown; params?: unknown }>;
        };
        const out: Record<string, { sceneId: string; params: Record<string, unknown> }> = {};
        for (const s of input.scenes ?? []) {
          if (
            typeof s.chapter === 'string' &&
            typeof s.sceneId === 'string' &&
            s.params !== null &&
            typeof s.params === 'object' &&
            !Array.isArray(s.params)
          ) {
            out[s.chapter] = {
              sceneId: s.sceneId,
              params: s.params as Record<string, unknown>,
            };
          }
        }
        log(
          `repair done case=${caseKey} ` +
            `fixed=${Object.keys(out).length}/${failures.length} ` +
            `input_tokens=${response.usage.input_tokens} ` +
            `output_tokens=${response.usage.output_tokens}`,
        );
        return out;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        log(`repair_error case=${caseKey} message="${message.slice(0, 200)}"`);
        return {};
      }
    },
  };
}
