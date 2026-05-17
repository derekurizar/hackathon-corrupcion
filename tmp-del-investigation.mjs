import { getDb, closeMongo } from './backend/dist/index.js';

const ID = '098720ff9142ca4624915e7aa32a78d59dc040cb5041ad7382cb15fc21d50b06';

const db = await getDb();
const col = db.collection('investigations');
const doc = await col.findOne({ _id: ID }, { projection: { caseKey: 1, buyer: 1, timeWindow: 1, updatedAt: 1 } });
if (!doc) {
  console.log('NOT FOUND — nothing to delete (id=' + ID + ')');
} else {
  console.log('FOUND:', JSON.stringify({ _id: doc._id, buyer: doc.buyer, timeWindow: doc.timeWindow, updatedAt: doc.updatedAt }));
  const res = await col.deleteOne({ _id: ID });
  console.log('deletedCount =', res.deletedCount);
}
await closeMongo();
