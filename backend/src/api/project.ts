import type {
  DashboardStats,
  Edition,
  Investigation,
} from '../schema/index.js';
import { moduleLogger } from '../obs/logger.js';
import type {
  EditionDTO,
  InvestigationFull,
  InvestigationListItem,
  StatsDTO,
  SupplierPublic,
} from './dto.js';

const log = moduleLogger('api/project');

type Lang = 'es' | 'en';

const FORBIDDEN_KEYS = ['signalIds', 'evidenceHash', 'version', 'status'] as const;

/**
 * Defense-in-depth: throws if a projected DTO still carries any internal field
 * or a person's supplier id. Round-trips through JSON so getters/prototypes
 * can't hide a leaked key.
 */
export function assertNoLeak(dto: unknown): void {
  const plain = JSON.parse(JSON.stringify(dto)) as Record<string, unknown>;
  for (const key of FORBIDDEN_KEYS) {
    if (key in plain) {
      throw new Error(`api/project leak guard: forbidden key "${key}" present in DTO`);
    }
  }
  const supplier = plain['supplier'] as
    | { isIndividual?: unknown; id?: unknown }
    | undefined;
  if (
    supplier &&
    supplier.isIndividual === true &&
    supplier.id !== undefined
  ) {
    throw new Error(
      'api/project leak guard: individual supplier must not expose `id`',
    );
  }
}

/**
 * Public supplier shape. Drops the entity `id` for individuals (privacy) and
 * never carries internal scoring fields.
 */
export function projectSupplier(s: Investigation['supplier']): SupplierPublic {
  const base = {
    displayNameEs: s.displayNameEs,
    displayNameEn: s.displayNameEn,
    isIndividual: s.isIndividual,
  };
  // `exactOptionalPropertyTypes` — only attach `id` when it's actually present.
  return s.isIndividual ? base : { ...base, id: s.id };
}

function resolveCover(
  doc: Investigation,
  lang: Lang,
): { kicker: string; headline: string; dek: string } {
  return lang === 'en' ? doc.en.cover : doc.es.cover;
}

function projectListItemBase(doc: Investigation, lang: Lang): InvestigationListItem {
  const item: InvestigationListItem = {
    caseKey: doc._id,
    buyer: { id: doc.buyer.id, name: doc.buyer.name },
    supplier: projectSupplier(doc.supplier),
    signalFamily: doc.signalFamily,
    reviewPriority: doc.reviewPriority,
    totalValue: doc.totalValue,
    currency: doc.currency,
    headline: resolveCover(doc, lang),
    ...(doc.timeWindow ? { timeWindow: doc.timeWindow } : {}),
  };
  return item;
}

export function projectListItem(
  doc: Investigation,
  lang: Lang,
): InvestigationListItem {
  return projectListItemBase(doc, lang);
}

export function projectFull(
  doc: Investigation,
  lang: Lang,
): InvestigationFull {
  const story = lang === 'en' ? doc.en : doc.es;
  const audioUrl = lang === 'en' ? doc.audio?.en : doc.audio?.es;
  const cuePoints =
    lang === 'en' ? doc.podcastCuePoints?.en : doc.podcastCuePoints?.es;

  const result: InvestigationFull = {
    ...projectListItemBase(doc, lang),
    ruleIds: doc.ruleIds,
    story: story as Record<string, unknown>,
    scenePlan: doc.scenePlan as Record<string, unknown>,
    evidence: doc.evidence,
    updatedAt: doc.updatedAt,
    ...(audioUrl ? { audio: audioUrl } : {}),
    ...(cuePoints ? { podcastCuePoints: cuePoints } : {}),
  };
  assertNoLeak(result);
  return result;
}

export function projectStats(d: DashboardStats): StatsDTO {
  // Structural omission of `_id` (the internal `'current'` discriminator).
  const { _id: _omit, ...rest } = d;
  void _omit;
  return rest;
}

export function projectEdition(e: Edition): EditionDTO {
  // Stored `Edition._id` is the run/timestamp string key. Expose it as `id`
  // and drop the raw `_id`.
  const { _id, ...rest } = e;
  return { ...rest, id: String(_id) };
}

/** Map a page of stored docs to public list items (logs the batch size). */
export function projectListItems(
  docs: Investigation[],
  lang: Lang,
): InvestigationListItem[] {
  log(`project=listItems count=${docs.length} lang=${lang}`);
  return docs.map((d) => projectListItem(d, lang));
}
