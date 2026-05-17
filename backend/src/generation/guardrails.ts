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
 *  2. Every keyFinding (es + en) traces to at least one evidence item
 *     (substring either direction on `field` or `String(value)`).
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

  // 2 — every keyFinding maps to an evidence item
  const evidenceTokens: string[] = [];
  for (const e of bundle.evidence) {
    evidenceTokens.push(e.field.toLowerCase());
    evidenceTokens.push(String(e.value).toLowerCase());
    if (e.benchmark !== undefined) evidenceTokens.push(String(e.benchmark).toLowerCase());
  }
  const findings = [...story.es.keyFindings, ...story.en.keyFindings];
  for (const finding of findings) {
    const f = finding.toLowerCase();
    const mapped = evidenceTokens.some(
      (tok) => tok.length > 0 && (f.includes(tok) || tok.includes(f)),
    );
    if (!mapped) {
      return {
        ok: false,
        reason: `unbacked keyFinding: "${finding}"`,
      };
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
): Promise<{ story: ClaudeStoryRaw | null; usedFallback: boolean }> {
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
