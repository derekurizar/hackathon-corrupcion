import { moduleLogger } from '../obs/logger.js';
import type { ClaudeClient, ClaudeStoryRaw } from './claude.js';
import type { CaseBundle } from './rank.js';
import { buildSystemPrefix, buildUserBlock, BANNED_PHRASES } from './prompt.js';

const log = moduleLogger('guardrails');

/** Map a structured `reason` string to a stable, grep-friendly check label. */
function checkLabel(reason: string): string {
  if (reason.startsWith('banned phrase')) return 'banned_phrase';
  if (reason.startsWith('unbacked keyFinding')) return 'keyfinding_untraced';
  return 'unknown';
}

export type GuardrailCheckResult = { ok: true } | { ok: false; reason: string };

/** Result of a guarded story generation (passed/fell-back). */
export type GuardedStoryResult = { story: ClaudeStoryRaw | null; usedFallback: boolean };

/** Every string leaf in the story output, lower-cased for substring checks. */
function collectStrings(story: ClaudeStoryRaw): string[] {
  const out: string[] = [];
  const walk = (node: unknown): void => {
    if (node === null || node === undefined) return;
    if (typeof node === 'string') {
      out.push(node);
      return;
    }
    if (Array.isArray(node)) {
      for (const el of node) walk(el);
      return;
    }
    if (typeof node === 'object') {
      for (const v of Object.values(node as Record<string, unknown>)) walk(v);
    }
  };
  walk(story.es);
  walk(story.en);
  out.push(story.podcast.es.script, story.podcast.en.script);
  return out;
}

/**
 * Post-generation guardrail check (idea/00 §"Guardrail-fail behavior",
 * idea/04 §"Guardrail enforcement"):
 *  1. No banned phrase anywhere in the output (case-insensitive).
 *  2. Every `ev:<i>` CITED in a keyFinding must RESOLVE (be a real index into
 *     the full server-side evidence). We deliberately do NOT require the
 *     finding's prose to substring-match an evidence cell: the figures worth
 *     stating (shares, rollup aggregates, benchmark metrics) live in
 *     `benchmark`/digest rollups, never as a single `evidence[i].value`
 *     (and `String(benchmark)` on an object is just "[object Object]"), so
 *     the old substring check forced a universal fallback. The system-prefix
 *     guardrail ("every figure MUST trace to evidence; do not invent") is the
 *     soft anti-fabrication guard; this hard check only blocks invented
 *     citations (an `ev:<i>` index that does not exist).
 *
 * HACKATHON MODE: the raw-individual-name leak check was removed — entity
 * names are shown verbatim. The `_rawSupplierName` / `_entityTypeHint`
 * parameters are retained so callers (incl. `generateStoryGuarded`) keep an
 * unchanged positional call signature.
 */
export function checkGuardrails(
  story: ClaudeStoryRaw,
  bundle: CaseBundle,
  _rawSupplierName: string,
  _entityTypeHint: 'company' | 'individual' | 'unknown',
  bannedPhrases: string[],
): GuardrailCheckResult {
  const strings = collectStrings(story);
  const lower = strings.map((s) => s.toLowerCase());

  // 1 — banned phrases
  for (const phrase of bannedPhrases) {
    const p = phrase.toLowerCase();
    if (lower.some((s) => s.includes(p))) {
      return { ok: false, reason: `banned phrase: "${phrase}"` };
    }
  }

  // 2 — every `ev:<i>` cited in a keyFinding must be a real evidence index.
  // A finding with no `ev:` citation is allowed (the soft prompt guard
  // covers fabrication); a finding citing an out-of-range index is not.
  const evCount = bundle.evidence.length;
  const findings = [...story.es.keyFindings, ...story.en.keyFindings];
  for (const finding of findings) {
    for (const m of finding.matchAll(/ev:(\d+)/gi)) {
      const idx = Number.parseInt(m[1]!, 10);
      if (!Number.isInteger(idx) || idx < 0 || idx >= evCount) {
        return {
          ok: false,
          reason: `unbacked keyFinding: "${finding}" (ev:${m[1]} out of range 0..${evCount - 1})`,
        };
      }
    }
  }

  return { ok: true };
}

/**
 * Generates a guardrail-safe story (idea/04 §"Guardrail enforcement"):
 * generate → check → exactly one stricter retry → check → otherwise fall back.
 * NEVER throws — any Claude/ElevenLabs error or unhandled exception routes to
 * the deterministic evidence-only fallback (the caller builds the summary).
 */
export async function generateStoryGuarded(
  client: ClaudeClient,
  bundle: CaseBundle,
  supplierLabelEs: string,
  supplierLabelEn: string,
  rawSupplierName: string,
  entityTypeHint: 'company' | 'individual' | 'unknown',
): Promise<GuardedStoryResult> {
  try {
    const systemPrefix = buildSystemPrefix();
    const userBlock = buildUserBlock(bundle, supplierLabelEs, supplierLabelEn, entityTypeHint);

    let lastFailReason = 'no story produced';

    let story1: ClaudeStoryRaw | null = null;
    try {
      story1 = await client.generateStory({
        systemPrefix,
        userBlock,
        isLead: bundle.isLead,
      });
    } catch {
      story1 = null;
    }
    if (story1 !== null) {
      log(`checking case=${bundle.caseKey} attempt=1`);
      const check1 = checkGuardrails(
        story1,
        bundle,
        rawSupplierName,
        entityTypeHint,
        BANNED_PHRASES,
      );
      if (check1.ok) {
        log(`PASS case=${bundle.caseKey} attempt=1`);
        return { story: story1, usedFallback: false };
      }
      lastFailReason = check1.reason;
      log(
        `FAIL case=${bundle.caseKey} attempt=1 ` +
          `check=${checkLabel(check1.reason)} detail="${check1.reason}"`,
      );
    }

    // exactly one stricter retry
    log(`retrying case=${bundle.caseKey} with stricter prompt`);
    let story2: ClaudeStoryRaw | null = null;
    try {
      story2 = await client.generateStory({
        systemPrefix,
        userBlock,
        isLead: bundle.isLead,
        stricter: true,
      });
    } catch {
      story2 = null;
    }
    if (story2 !== null) {
      log(`checking case=${bundle.caseKey} attempt=2`);
      const check2 = checkGuardrails(
        story2,
        bundle,
        rawSupplierName,
        entityTypeHint,
        BANNED_PHRASES,
      );
      if (check2.ok) {
        log(`PASS case=${bundle.caseKey} attempt=2`);
        return { story: story2, usedFallback: false };
      }
      lastFailReason = check2.reason;
      log(
        `FAIL case=${bundle.caseKey} attempt=2 ` +
          `check=${checkLabel(check2.reason)} detail="${check2.reason}"`,
      );
    }

    log(
      `FALLBACK case=${bundle.caseKey} ` +
        `reason="failed after 2 attempts (check=${checkLabel(lastFailReason)})"`,
    );
    return { story: null, usedFallback: true };
  } catch (err) {
    // Absolute backstop — guardrails NEVER throw.
    log(
      `FALLBACK case=${bundle.caseKey} ` +
        `reason="unhandled error: ${err instanceof Error ? err.message : String(err)}"`,
    );
    return { story: null, usedFallback: true };
  }
}
