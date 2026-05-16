import type { ClaudeClient, ClaudeStoryRaw } from './claude.js';
import type { CaseBundle } from './rank.js';
import { buildSystemPrefix, buildUserBlock, BANNED_PHRASES } from './prompt.js';

export type GuardrailCheckResult =
  | { ok: true }
  | { ok: false; reason: string };

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
 *  3. When entityType ∈ {individual, unknown}, the raw supplier name never
 *     appears in any output string.
 */
export function checkGuardrails(
  story: ClaudeStoryRaw,
  bundle: CaseBundle,
  rawSupplierName: string,
  entityTypeHint: 'company' | 'individual' | 'unknown',
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
    if (e.benchmark !== undefined)
      evidenceTokens.push(String(e.benchmark).toLowerCase());
  }
  const findings = [
    ...story.es.keyFindings,
    ...story.en.keyFindings,
  ];
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

  // 3 — no raw individual name leak
  if (
    (entityTypeHint === 'individual' || entityTypeHint === 'unknown') &&
    rawSupplierName.trim().length > 0
  ) {
    const raw = rawSupplierName.toLowerCase();
    if (lower.some((s) => s.includes(raw))) {
      return { ok: false, reason: 'raw individual name leaked' };
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
    const userBlock = buildUserBlock(
      bundle,
      supplierLabelEs,
      supplierLabelEn,
      entityTypeHint,
    );

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
      const check1 = checkGuardrails(
        story1,
        bundle,
        rawSupplierName,
        entityTypeHint,
        BANNED_PHRASES,
      );
      if (check1.ok) return { story: story1, usedFallback: false };
    }

    // exactly one stricter retry
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
      const check2 = checkGuardrails(
        story2,
        bundle,
        rawSupplierName,
        entityTypeHint,
        BANNED_PHRASES,
      );
      if (check2.ok) return { story: story2, usedFallback: false };
    }

    return { story: null, usedFallback: true };
  } catch {
    // Absolute backstop — guardrails NEVER throw.
    return { story: null, usedFallback: true };
  }
}
