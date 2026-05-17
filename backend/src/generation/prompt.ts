import { caseTotalValue, type CaseBundle } from './rank.js';
import {
  buildCaseDigest,
  renderDigestBlock,
  resolveDigestConfig,
  type DigestConfig,
} from './digest.js';
import { renderSceneCatalog, chapterShortlists } from './scene-catalog.js';

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
export const FIXED_CAVEAT_ES = 'Estas son señales de revisión, no conclusiones de ilegalidad.';
export const FIXED_CAVEAT_EN = 'These are review signals, not conclusions of illegality.';

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
    '- The user block is an AGGREGATED CASE DIGEST: per-rule rollups plus a',
    '  representative evidence sample. Rollup counts/sums ARE evidence you may',
    '  cite. Only cite ev:<i> that literally appears in the block; never invent one.',
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
    '- The podcast.{lang}.script is a STANDALONE narrated retelling of the case for',
    '  audio-only listeners — NOT a caption of the article and NOT synced to scrolling.',
    '  Write ~350-500 words: an unhurried, descriptive voice-over that walks the',
    '  listener through the story scene by scene — set the scene, then follow the',
    '  chapters in order (the case -> follow the money -> the connections -> the',
    '  timeline -> what it means and what it does not). Narrate it as flowing spoken',
    '  prose (no headings, no bullet points, no "ev:" tokens). Stay strictly within',
    '  the VOICE and GUARDRAILS rules: every figure, date and name must trace to the',
    '  evidence — descriptive in tone, never speculative. End with the exact caveat',
    '  for that language.',
    '- TTS FORMATTING for podcast.{lang}.script (text-to-speech voice-over):',
    '  - Write every number, money amount, percentage and date as SPOKEN WORDS in',
    '    that script\'s own language — never digits, symbols or abbreviations. The',
    '    figure must still match the evidence exactly. Examples (es): "2,300,000"',
    '    -> "dos millones trescientos mil quetzales"; "14%" -> "catorce por',
    '    ciento"; "2023-03-08" -> "ocho de marzo de dos mil veintitrés". (en):',
    '    "Q2,300,000" -> "two point three million quetzales"; "14%" -> "fourteen',
    '    percent"; "2023" -> "twenty twenty-three". This stops the multilingual',
    '    voice from mis-reading or switching language mid-number.',
    '  - Control pacing mostly with natural punctuation and ellipses ("…") for a',
    '    beat. For a deliberate dramatic pause at a major transition (e.g. between',
    '    chapters or before a key figure) you MAY insert an ElevenLabs break tag',
    '    exactly as <break time="1.0s" /> (seconds, max "3.0s"). Use these',
    '    sparingly — at most a handful across the whole script; overuse degrades',
    '    audio quality. Do not place a break tag inside the closing caveat.',
    '- podcast cuePoints remain APPROXIMATE chapter markers over this longer track',
    '  (rough per-chapter start seconds, in order); tight/word-level sync is an',
    '  explicit non-goal.',
    '- scenePlan has one entry per chapter (cover, elCaso, sigueElDinero,',
    '  lasConexiones, evidencia, cronologia, cierre). For each, set sceneId to',
    "  one of that chapter's ALLOWED SCENES (user block) and fill params per the",
    '  SCENE CATALOG below. An invalid sceneId or params is discarded and the',
    "  server's deterministic default scene is used. Choose, per chapter, the",
    "  scene whose shape best tells this case's story — variants are encouraged",
    '  when the evidence fits them.',
    '- Respond ONLY with the JSON object. No prose, no markdown fences.',
    '',
    renderSceneCatalog(),
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
  digestCfg?: DigestConfig,
): string {
  const cfg = digestCfg ?? resolveDigestConfig();
  const digest = buildCaseDigest(bundle, cfg);

  const hasBenchmark = bundle.signals.some((s) =>
    s.evidence.some((e) => e.benchmark !== undefined),
  );
  const allowedSceneLines = chapterShortlists(bundle.firedRuleIds, hasBenchmark).map(
    ({ chapter, scenes }) =>
      `- ${chapter}: ${scenes.map((s, i) => (i === 0 ? `${s} (default)` : s)).join(', ')}`,
  );

  return [
    `CASE ${bundle.caseKey} — signal family ${bundle.family}`,
    `scope: ${bundle.scope}`,
    '',
    'ENTITIES',
    `- buyer: id=${bundle.buyer.id} name=${bundle.buyer.name}`,
    `- supplier: label_es="${supplierLabelEs}" label_en="${supplierLabelEn}" ` +
      `entityType=${entityTypeHint}`,
    '',
    renderDigestBlock(digest),
    '',
    'ALLOWED SCENES (set scenePlan[chapter].sceneId to one of these; ' +
      'fill params per the SCENE CATALOG)',
    ...allowedSceneLines,
    '',
    `totalValue: ${caseTotalValue(bundle.signals)}`,
    'currency: GTQ',
    '',
    'Use ONLY the facts provided here. Do not invent amounts, dates, names, or',
    'statistics not present in this evidence block.',
  ].join('\n');
}
