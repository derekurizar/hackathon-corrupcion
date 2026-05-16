import { getDb } from './client.js';

/**
 * Creates/verifies all MongoDB Atlas indexes for the project.
 *
 * Idempotent: `collection.createIndex()` is a no-op when the index already
 * exists with the same spec, and `db.createCollection()` errors with code 48
 * (NamespaceExists) are swallowed. Safe to call repeatedly.
 *
 * Index set mirrors planning/idea/06-data-model.md. The single `$text` index
 * on `investigations` spans es+en cover headline+dek — MongoDB allows only one
 * text index per collection, so this is the only one.
 */
export async function ensureIndexes(): Promise<void> {
  const db = await getDb();

  // curatedReleases — ocid is the idempotency key (must be unique)
  const cr = db.collection('curatedReleases');
  await cr.createIndex({ ocid: 1 }, { unique: true });
  await cr.createIndex({ 'buyer.id': 1 });
  await cr.createIndex({ 'awards.supplierIds': 1 });
  await cr.createIndex({ 'tender.itemFamilies': 1 });
  await cr.createIndex({ year: 1, month: 1 });
  await cr.createIndex({ 'tender.procurementMethodDetails': 1 });

  // entities
  const ent = db.collection('entities');
  await ent.createIndex({ kind: 1 });
  await ent.createIndex({ entityType: 1 });
  await ent.createIndex({ 'rollup.awardValue': -1 });

  // signals
  const sig = db.collection('signals');
  await sig.createIndex({ caseKey: 1 });
  await sig.createIndex({ rule_id: 1 });
  await sig.createIndex({ family: 1 });
  await sig.createIndex({ ocid: 1 });

  // investigations — NOTE: only ONE $text index allowed per collection
  const inv = db.collection('investigations');
  await inv.createIndex({ reviewPriority: 1, updatedAt: -1 });
  await inv.createIndex({ 'buyer.id': 1 });
  await inv.createIndex({ signalFamily: 1 });
  await inv.createIndex({ ruleIds: 1 });
  await inv.createIndex({
    'es.cover.headline': 'text',
    'es.cover.dek': 'text',
    'en.cover.headline': 'text',
    'en.cover.dek': 'text',
  });

  // editions
  await db.collection('editions').createIndex({ publishedAt: -1 });

  // ensure collection exists for collections with no indexes
  for (const name of ['benchmarks', 'dashboardStats', 'pipelineRuns'] as const) {
    try {
      await db.createCollection(name);
    } catch (err) {
      // swallow NamespaceExists (code 48) — collection already exists
      const e = err as { code?: number; codeName?: string };
      if (e.code !== 48 && e.codeName !== 'NamespaceExists') throw err;
    }
  }
}
