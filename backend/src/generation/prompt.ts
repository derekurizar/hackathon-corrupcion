import type { CaseBundle } from './rank.js';

/**
 * Banned phrases (content sourced verbatim from idea/00-product.md
 * §"Positioning" → "Never say", plus ES equivalents). The story may never
 * assert wrongdoing — only "review signals" / "unusual pattern".
 */
export const BANNED_PHRASES: string[] = [
  // EN (idea/00 §Positioning "Never say")
  'this is corruption',
  'committed fraud',
  'this contract is illegal',
  'the system detected wrongdoing',
  // ES equivalents
  'esto es corrupción',
  'cometió fraude',
  'este contrato es ilegal',
  'el sistema detectó irregularidades',
];

/** Mandatory closing caveat — fixed, privacy-safe wording (idea/00 / idea/04). */
export const FIXED_CAVEAT_ES =
  'Estas son señales de revisión, no conclusiones de ilegalidad.';
export const FIXED_CAVEAT_EN =
  'These are review signals, not conclusions of illegality.';

/**
 * Stable system prefix (idea/04 §"Prompt structure with prompt caching"). This
 * string is passed as a single cached content block — it must NOT vary per
 * case or prompt caching is silently disabled.
 */
export function buildSystemPrefix(): string {
  return [
    'You are an investigative journalist assistant for a public procurement newsroom.',
    '',
    'VOICE',
    '- Write in a newsroom lead / nut-graf style: evidence-forward, precise, sober.',
    '- No hype, no adjectives of accusation, no speculation beyond the evidence.',
    '',
    'GUARDRAILS (NON-NEGOTIABLE)',
    '- Never write any of these phrases (or close paraphrases): "this is corruption",',
    '  "committed fraud", "this contract is illegal", "the system detected wrongdoing",',
    '  "esto es corrupción", "cometió fraude", "este contrato es ilegal",',
    '  "el sistema detectó irregularidades".',
    '- Say "review signals", "unusual pattern vs comparable contracts",',
    '  "contracts worth reviewing" — never legal conclusions of guilt.',
    '- Every factual claim MUST trace to a provided evidence item. Do not invent',
    '  amounts, dates, names, percentages, or statistics not present in the evidence.',
    '- If any supplier has entityType = individual or unknown, refer to them ONLY by',
    '  the anonymized label provided; never emit the raw personal name.',
    '',
    'ANONYMIZATION RULE',
    "- Institutions and companies are named. Natural-person suppliers appear ONLY as",
    "  'an individual supplier' (EN) / 'un proveedor individual' (ES).",
    '',
    'OUTPUT — respond with ONLY valid JSON (no markdown fences), exactly this shape:',
    '{',
    '  "es": {',
    '    "cover": { "kicker": "", "headline": "", "dek": "" },',
    '    "elCaso": "", "sigueElDinero": "", "lasConexiones": "", "cronologia": "",',
    '    "cierre": { "queSignificaYQueNo": "", "caveat": "" },',
    '    "keyFindings": []',
    '  },',
    '  "en": {',
    '    "cover": { "kicker": "", "headline": "", "dek": "" },',
    '    "theCase": "", "followTheMoney": "", "theConnections": "", "timeline": "",',
    '    "closing": { "whatItMeans": "", "caveat": "" },',
    '    "keyFindings": []',
    '  },',
    '  "podcast": {',
    '    "es": { "script": "", "cuePoints": [ { "chapter": "", "tSec": 0 } ] },',
    '    "en": { "script": "", "cuePoints": [ { "chapter": "", "tSec": 0 } ] }',
    '  },',
    '  "scenePlan": { "<chapter>": { "sceneId": "", "params": {} } }',
    '}',
    '',
    'MANDATORY',
    `- es.cierre.caveat MUST equal exactly: "${FIXED_CAVEAT_ES}"`,
    `- en.closing.caveat MUST equal exactly: "${FIXED_CAVEAT_EN}"`,
    '- podcast scripts ~150 words (≈60s) and end with the caveat in that language.',
    '- scenePlan keys are the 7 chapters: cover, elCaso, sigueElDinero,',
    '  lasConexiones, evidencia, cronologia, cierre. Pick a sceneId only from the',
    '  data the evidence supports; quantitative params must carry a ref to a',
    '  signal/evidence id.',
    '- Respond ONLY with the JSON object. No prose, no markdown fences.',
  ].join('\n');
}

/**
 * Per-case user block (idea/04 §"Per-case user block"). Contains ONLY the
 * facts the model is allowed to use — fired signals, evidence items, entities
 * (buyer named; supplier as the anonymized label + entityType hint), values,
 * scope.
 */
export function buildUserBlock(
  bundle: CaseBundle,
  supplierLabelEs: string,
  supplierLabelEn: string,
  entityTypeHint: string,
): string {
  const signalLines = bundle.signals
    .map(
      (s) =>
        `- rule_id=${s.rule_id} severity=${s.severity} ` +
        `confidence=${s.confidence} family=${s.family}\n` +
        `  explanation: ${s.explanation}\n` +
        `  story_angle: ${s.story_angle}`,
    )
    .join('\n');

  const evidenceLines = bundle.evidence
    .map((e, i) => {
      const parts = [`ev:${i} field=${e.field} value=${String(e.value)}`];
      if (e.comparison !== undefined) parts.push(`comparison=${e.comparison}`);
      if (e.benchmark !== undefined)
        parts.push(`benchmark=${String(e.benchmark)}`);
      return `- ${parts.join(' ')}`;
    })
    .join('\n');

  // Headline value = max numeric evidence whose field hints money.
  let totalValue = 0;
  for (const e of bundle.evidence) {
    const f = e.field.toLowerCase();
    if (
      (f.includes('value') || f.includes('amount')) &&
      typeof e.value === 'number' &&
      Number.isFinite(e.value) &&
      e.value > totalValue
    ) {
      totalValue = e.value;
    }
  }

  return [
    `CASE ${bundle.caseKey} — signal family ${bundle.family}`,
    `scope: ${bundle.scope}`,
    '',
    'ENTITIES',
    `- buyer: id=${bundle.buyer.id} name=${bundle.buyer.name}`,
    `- supplier: label_es="${supplierLabelEs}" label_en="${supplierLabelEn}" ` +
      `entityType=${entityTypeHint}`,
    '',
    'FIRED SIGNALS',
    signalLines || '- (none)',
    '',
    'EVIDENCE (the only facts you may use; ev:<i> are stable refs)',
    evidenceLines || '- (none)',
    '',
    `totalValue: ${totalValue}`,
    'currency: GTQ',
    '',
    'Use ONLY the facts provided here. Do not invent amounts, dates, names, or',
    'statistics not present in this evidence block.',
  ].join('\n');
}
