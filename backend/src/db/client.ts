import { MongoClient, type Db } from 'mongodb';
import { loadConfig } from '../config/env.js';

let clientPromise: Promise<MongoClient> | undefined;

export function getMongoClient(): Promise<MongoClient> {
  if (!clientPromise) {
    const { MONGODB_URI } = loadConfig();
    clientPromise = new MongoClient(MONGODB_URI).connect();
  }
  return clientPromise;
}

export async function getDb(name?: string): Promise<Db> {
  const client = await getMongoClient();
  return client.db(name);
}

export async function closeMongo(): Promise<void> {
  if (clientPromise) {
    const client = await clientPromise;
    await client.close();
    clientPromise = undefined;
  }
}
