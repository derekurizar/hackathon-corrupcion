import { getCollection } from '../db/collections.js';
import type { Entity } from '../schema/index.js';
import { getDb } from '../db/client.js';

/**
 * Upserts an entity's scalar fields WITHOUT ever overwriting `rollup`.
 * `rollup` is written only on insert via `$setOnInsert`; recomputeRollup()
 * is the only path that mutates it afterward.
 */
export async function upsertEntity(
  doc: Omit<Entity, 'rollup'> & { rollup?: Entity['rollup'] },
): Promise<void> {
  const col = await getCollection('entities');
  const defaultRollup: Entity['rollup'] = {
    awardCount: 0,
    awardValue: 0,
    buyerIds: [],
    categoryFamilies: [],
    firstAwardDate: '',
    lastAwardDate: '',
    historyAvgValue: 0,
  };
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
      $setOnInsert: { rollup: doc.rollup ?? defaultRollup },
    } as never,
    { upsert: true },
  );
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
          categoryFamilies: ((result['categoryFamilies'] as unknown[]) ?? []).filter(
            Boolean,
          ),
          firstAwardDate: (result['firstAwardDate'] as string) ?? '',
          lastAwardDate: (result['lastAwardDate'] as string) ?? '',
          historyAvgValue,
        },
      },
    } as never,
  );
}
