import { canonicalEntityId, deriveEntityType } from '../identity/index.js';
import type { Entity } from '../schema/index.js';
import type { GuatecomprasRecord } from '../ocds/index.js';

/** Entity doc as produced by ingestion: scalar fields only, no `rollup` (the
 * repo seeds `rollup` on insert via `$setOnInsert`; `recomputeRollup` is the
 * only writer afterward). */
export type IngestEntity = Omit<Entity, 'rollup'>;

/**
 * Extracts buyer/supplier `entities` docs from `compiledRelease.parties[]`.
 *
 * - `_id = canonicalEntityId(identifier.scheme, identifier.id)` (Area 03).
 * - `kind` comes from `roles[]`. `EntitySchema.kind` is `enum(['supplier',
 *   'buyer'])` — there is no "both" value, so a party that is BOTH a buyer and
 *   a supplier emits **two** docs (one per kind, same `_id`). Other roles
 *   (e.g. `tenderer`) are ignored — only buyer/supplier are entity kinds.
 * - `entityType = deriveEntityType({ legalEntityTypeDetail:
 *   party.details?.legalEntityTypeDetail?.description, name: party.name })`
 *   (Area 03 heuristic). `'unknown'` is treated as **individual**
 *   (privacy-safe) by the downstream anonymization step (Area 07).
 * - `name` and `legalEntityTypeDetail` are stored **raw/verbatim** — no
 *   masking at ingestion (anonymization happens at the story layer).
 *
 * When `compiledRelease.parties` is absent/empty (~0.52% of records) this
 * returns `[]` — we never fabricate canonical ids from `OrganizationReference`
 * objects (which lack `identifier.scheme`/`identifier.id`).
 */
export function extractEntities(record: GuatecomprasRecord): IngestEntity[] {
  const parties = record.compiledRelease.parties ?? [];
  const out: IngestEntity[] = [];

  for (const party of parties) {
    const isBuyer = party.roles.includes('buyer');
    const isSupplier = party.roles.includes('supplier');
    if (!isBuyer && !isSupplier) continue;

    const _id = canonicalEntityId(party.identifier.scheme, party.identifier.id);
    const legalEntityTypeDetail = party.details?.legalEntityTypeDetail?.description;
    const entityType = deriveEntityType({
      ...(legalEntityTypeDetail !== undefined ? { legalEntityTypeDetail } : {}),
      name: party.name,
    });

    const base = {
      _id,
      name: party.name,
      entityType,
      // `exactOptionalPropertyTypes`: only set the optional key when present.
      ...(legalEntityTypeDetail !== undefined ? { legalEntityTypeDetail } : {}),
    };

    if (isBuyer) out.push({ ...base, kind: 'buyer' });
    if (isSupplier) out.push({ ...base, kind: 'supplier' });
  }

  return out;
}
