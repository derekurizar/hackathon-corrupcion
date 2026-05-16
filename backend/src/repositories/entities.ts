import { getCollection } from '../db/collections.js';
import type { Entity } from '../schema/index.js';
import { getDb } from '../db/client.js';

/** Shared default rollup — single source of truth for single + bulk upserts. */
const DEFAULT_ROLLUP: Entity['rollup'] = {
  awardCount: 0,
  awardValue: 0,
  buyerIds: [],
  categoryFamilies: [],
  firstAwardDate: '',
  lastAwardDate: '',
  historyAvgValue: 0,
};

/**
 * Upserts an entity's scalar fields WITHOUT ever overwriting `rollup`.
 * `rollup` is written only on insert via `$setOnInsert`; recomputeRollup()
 * is the only path that mutates it afterward.
 */
export async function upsertEntity(
  doc: Omit<Entity, 'rollup'> & { rollup?: Entity['rollup'] },
): Promise<void> {
  const col = await getCollection('entities');
  await col.updateOne(
    { _id: doc._id } as never,
    {
      $set: {
        name: doc.name,
        kind: doc.kind,
        entityType: doc.entityType,
        ...(doc.legalEntityTypeDetail !== undefined
          ? { legalEntityTypeDetail: doc.legalEntityTypeDetail }
          : {}),
      },
      $setOnInsert: { rollup: doc.rollup ?? DEFAULT_ROLLUP },
    } as never,
    { upsert: true },
  );
}

/**
 * Bulk variant of `upsertEntity` — identical `$set` scalar / `$setOnInsert`
 * rollup semantics (rollup never clobbered by ingest), one round-trip per
 * call. Unordered so a single dup-key style failure never aborts the batch.
 */
export async function bulkUpsertEntities(
  docs: Array<Omit<Entity, 'rollup'> & { rollup?: Entity['rollup'] }>,
): Promise<void> {
  if (docs.length === 0) return;
  const col = await getCollection('entities');
  const ops = docs.map((doc) => ({
    updateOne: {
      filter: { _id: doc._id },
      update: {
        $set: {
          name: doc.name,
          kind: doc.kind,
          entityType: doc.entityType,
          ...(doc.legalEntityTypeDetail !== undefined
            ? { legalEntityTypeDetail: doc.legalEntityTypeDetail }
            : {}),
        },
        $setOnInsert: { rollup: doc.rollup ?? DEFAULT_ROLLUP },
      },
      upsert: true,
    },
  }));
  await col.bulkWrite(ops as never[], { ordered: false });
}

/**
 * Bulk variant of `setEntityRollup` — writes precomputed rollups in chunks of
 * 100 (chunking owned here so callers stay simple). `upsert:false` mirrors the
 * single-doc `setEntityRollup` (rollup is only set on entities ingest created).
 */
export async function bulkSetEntityRollups(
  entries: Array<readonly [string, Entity['rollup']]>,
): Promise<void> {
  if (entries.length === 0) return;
  const col = await getCollection('entities');
  const CHUNK = 100;
  for (let i = 0; i < entries.length; i += CHUNK) {
    const ops = entries.slice(i, i + CHUNK).map(([id, rollup]) => ({
      updateOne: { filter: { _id: id }, update: { $set: { rollup } }, upsert: false },
    }));
    await col.bulkWrite(ops as never[], { ordered: false });
  }
}

/**
 * Writes a precomputed rollup onto an entity doc (Area 05). Unlike
 * `recomputeRollup`, this does NOT run a Mongo aggregation joining on
 * `awards.supplierIds` — that join is BROKEN for raw supplier ids
 * (`GT-NIT-7894880`) vs canonical entity `_id`s (`GT-NIT:7894880`).
 * `build-benchmarks` resolves raw → canonical in-memory during its single
 * corpus pass and writes the correct rollup here, exactly once per entity.
 */
export async function setEntityRollup(entityId: string, rollup: Entity['rollup']): Promise<void> {
  const col = await getCollection('entities');
  await col.updateOne({ _id: entityId } as never, { $set: { rollup } } as never);
}

/** All entity docs (Area 05 builds an in-memory `EntityIndex` from these). */
export async function getAllEntities(): Promise<Entity[]> {
  const col = await getCollection('entities');
  return col.find({} as never).toArray() as Promise<Entity[]>;
}

export async function recomputeRollup(entityId: string): Promise<void> {
  const db = await getDb();
  // Aggregate from curatedReleases where this entity appears as a supplier
  const pipeline = [
    { $match: { 'awards.supplierIds': entityId } },
    { $unwind: '$awards' },
    { $match: { 'awards.supplierIds': entityId } },
    {
      $group: {
        _id: null,
        awardCount: { $sum: 1 },
        awardValue: { $sum: '$awards.value.amount' },
        buyerIds: { $addToSet: '$buyer.id' },
        categoryFamilies: { $addToSet: { $arrayElemAt: ['$tender.itemFamilies', 0] } },
        firstAwardDate: { $min: '$awards.date' },
        lastAwardDate: { $max: '$awards.date' },
      },
    },
  ];
  const [result] = await db.collection('curatedReleases').aggregate(pipeline).toArray();
  if (!result) return;
  const awardCount = result['awardCount'] as number;
  const awardValue = result['awardValue'] as number;
  const historyAvgValue = awardCount > 0 ? awardValue / awardCount : 0;
  await db.collection('entities').updateOne(
    { _id: entityId } as never,
    {
      $set: {
        rollup: {
          awardCount,
          awardValue,
          buyerIds: (result['buyerIds'] as string[]) ?? [],
          categoryFamilies: ((result['categoryFamilies'] as unknown[]) ?? []).filter(Boolean),
          firstAwardDate: (result['firstAwardDate'] as string) ?? '',
          lastAwardDate: (result['lastAwardDate'] as string) ?? '',
          historyAvgValue,
        },
      },
    } as never,
  );
}
