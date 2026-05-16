import { getCollection } from '../db/collections.js';
import type { Edition } from '../schema/index.js';

export async function getCurrentEdition(): Promise<Edition | null> {
  const col = await getCollection('editions');
  return col.findOne({} as never, {
    sort: { publishedAt: -1 },
  }) as Promise<Edition | null>;
}

export async function upsertEdition(doc: Edition): Promise<void> {
  const col = await getCollection('editions');
  await col.replaceOne({ _id: doc._id } as never, doc as never, { upsert: true });
}

/** Area 07 — append a new Edition per publish run (`_id` = run id/timestamp). */
export async function insertEdition(doc: Edition): Promise<void> {
  const col = await getCollection('editions');
  await col.insertOne(doc as never);
}
