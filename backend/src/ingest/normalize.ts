import { CuratedReleaseSchema, type CuratedRelease } from '../schema/index.js';
import { canonicalEntityId } from '../identity/index.js';
import type { GuatecomprasRecord } from '../ocds/index.js';

/**
 * Maps a raw Guatecompras `compiledRelease` to a `CuratedReleaseSchema`-valid
 * document, dropping the heavy noise blobs (`tender.documents[]` →
 * `documentsSummary`; `tender.items[].attributes[]` dropped entirely).
 *
 * Key normalization decisions (data-expert directives — do NOT change without
 * coordinating with Area 05 detection):
 *
 * - **Parties map** is keyed by `party.id` *verbatim* (the pre-composed string
 *   like `GT-NIT-7894880`), value = `canonicalEntityId(scheme, id)`. This
 *   works because `awards[].suppliers[].id` and `bids.details[].tenderers[].id`
 *   carry the same verbatim `party.id`.
 * - `bids[].tendererId` = the **raw** `tenderers[0].id` (NOT canonicalized).
 *   Detection rules join `tendererId` ↔ `supplierIds[]`; both must be the same
 *   raw `OrganizationReference.id` string type.
 * - `awards[].supplierIds[]` = the **raw** `awards[].suppliers[].id`.
 * - When `compiledRelease.parties` is absent/empty (~0.52%): the parties map is
 *   empty; raw ids fall through everywhere; `region` becomes `""`.
 * - `documentsSummary.firstDatePublished` is `""` when there are no
 *   `tender.documents` — the frozen schema requires `z.string()` (NOT
 *   nullable), so `""` is the sentinel. **Callers MUST guard `!== ''` before
 *   date-parsing it.**
 * - `contracts[].documentsCount` = `contract.documents?.length ?? 0`.
 * - UNSPSC `itemFamilies`: a 4-char prefix of `classification.id`; an item
 *   whose `classification.id.length < 4` contributes nothing.
 * - Sparsity defaults: absent `bids/awards/contracts` → `[]`; absent
 *   `mainProcurementCategory` (~0.24%) → `"unknown"`; absent
 *   `tenderPeriod.endDate` (~75%) → `null` (schema is nullable here).
 * - Money is kept as `Number` (float64) — never stringified.
 *
 * Throws (with `ocid` context) if the result does not satisfy
 * `CuratedReleaseSchema`.
 */
export function toCuratedRelease(
  record: GuatecomprasRecord,
  ctx: { year: number; month: number },
): CuratedRelease {
  const cr = record.compiledRelease;

  // party.id (verbatim) → canonicalEntityId(scheme, id)
  const partiesMap = new Map<string, string>();
  for (const party of cr.parties ?? []) {
    partiesMap.set(party.id, canonicalEntityId(party.identifier.scheme, party.identifier.id));
  }

  // buyer.id → canonical id when the buyer party is present, else raw id.
  // (Rollups/grouping join on the canonical id when available.)
  const buyerId = partiesMap.get(cr.buyer.id) ?? cr.buyer.id;

  // region from the buyer party's address.region (stored; UI is stretch).
  const buyerParty = (cr.parties ?? []).find((p) => p.id === cr.buyer.id);
  const region = buyerParty?.address?.region ?? '';

  // itemFamilies: unique 4-char UNSPSC prefixes; skip ids shorter than 4.
  const familySet = new Set<string>();
  for (const item of (cr.tender.items ?? [])) {
    const cid = item.classification.id;
    if (cid.length < 4) continue;
    familySet.add(cid.slice(0, 4));
  }

  const docs = cr.tender.documents ?? [];
  const docTypes = [
    ...new Set(docs.map((d) => d.documentType).filter((t): t is string => typeof t === 'string')),
  ];
  const firstDatePublished =
    docs.length === 0
      ? '' // sentinel: no documents — callers MUST guard `!== ''` before parsing
      : docs.reduce(
          (min, d) => (d.datePublished < min ? d.datePublished : min),
          docs[0]!.datePublished,
        );

  const bids = (cr.bids?.details ?? []).map((b) => ({
    status: b.status,
    amount: b.value.amount, // Number (float64) — never stringified
    // RAW tenderer id (NOT canonicalized) — joins with raw supplierIds.
    tendererId: b.tenderers[0]?.id ?? '',
  }));
  const bidCounts = {
    count: bids.length,
    valid: bids.filter((b) => b.status === 'valid').length,
    disqualified: bids.filter((b) => b.status === 'disqualified').length,
  };

  const awards = (cr.awards ?? []).map((a) => ({
    id: a.id,
    date: a.date,
    status: a.status,
    statusDetails: a.statusDetails,
    value: { amount: a.value.amount, currency: a.value.currency },
    supplierIds: a.suppliers.map((s) => s.id), // RAW supplier ids
  }));

  const contracts = (cr.contracts ?? []).map((c) => ({
    id: c.id,
    awardID: c.awardID,
    dateSigned: c.dateSigned,
    value: { amount: c.value.amount, currency: c.value.currency },
    period: { start: c.period.startDate, end: c.period.endDate },
    documentsCount: c.documents?.length ?? 0,
    contractNumber: c.contractNumber,
  }));

  const result: CuratedRelease = {
    ocid: cr.ocid,
    id: cr.id,
    date: cr.date,
    year: ctx.year,
    month: ctx.month,
    buyer: { id: buyerId, name: cr.buyer.name },
    tender: {
      id: cr.tender.id,
      title: cr.tender.title,
      statusDetails: cr.tender.statusDetails,
      procurementMethodDetails: cr.tender.procurementMethodDetails,
      mainProcurementCategory: cr.tender.mainProcurementCategory ?? 'unknown',
      numberOfTenderers: cr.tender.numberOfTenderers,
      datePublished: cr.tender.datePublished,
      tenderPeriod: {
        startDate: cr.tender.tenderPeriod.startDate,
        endDate: cr.tender.tenderPeriod.endDate ?? null,
      },
      items: (cr.tender.items ?? []).map((it) => ({
        classificationId: it.classification.id,
        scheme: it.classification.scheme,
        description: it.description,
        quantity: it.quantity,
        unitName: it.unit.name,
      })),
      itemFamilies: [...familySet],
      documentsSummary: {
        count: docs.length,
        types: docTypes,
        firstDatePublished,
      },
    },
    bids,
    bidCounts,
    awards,
    contracts,
    region,
  };

  const parsed = CuratedReleaseSchema.safeParse(result);
  if (!parsed.success) {
    const detail = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Curated release failed schema validation for ocid ${cr.ocid}: ${detail}`);
  }
  return parsed.data;
}
