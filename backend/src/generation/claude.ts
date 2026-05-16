import Anthropic from '@anthropic-ai/sdk';
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

const log = (m: string): void => console.error(`[claude] ${m}`);

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

  return {
    async generateStory(opts): Promise<ClaudeStoryRaw> {
      const model =
        cfg.OPUS_LEAD && opts.isLead
          ? 'claude-opus-4-7'
          : 'claude-sonnet-4-6';
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
            max_tokens: 4096,
            system: [
              {
                type: 'text',
                text: opts.systemPrefix,
                cache_control: { type: 'ephemeral' },
              },
            ],
            messages: [{ role: 'user', content: userBlock }],
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
            throw new ClaudeParseError(
              'Claude response missing es/en/podcast/scenePlan',
            );
          }
          log(
            `done case=${caseKey} attempt=${attempt + 1} ` +
              `input_tokens=${response.usage.input_tokens} ` +
              `output_tokens=${response.usage.output_tokens} ` +
              `cached_tokens=${response.usage.cache_read_input_tokens ?? 0}`,
          );
          return parsed;
        } catch (err) {
          if (err instanceof ClaudeParseError) throw err;
          lastErr = err;
          if (
            isRateLimit(err) &&
            attempt < RETRY_DELAYS_MS.length
          ) {
            const base = RETRY_DELAYS_MS[attempt]!;
            const delay = base + Math.random() * 500;
            log(
              `rate_limited case=${caseKey} attempt=${attempt + 1} ` +
                `retrying in ${Math.round(delay)}ms`,
            );
            await sleep(delay);
            continue;
          }
          throw err;
        }
      }
      log(`failed case=${caseKey} all_attempts_exhausted`);
      throw lastErr instanceof Error
        ? lastErr
        : new Error(String(lastErr));
    },
  };
}
