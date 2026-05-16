import { getCollection } from '../db/collections.js';
import type { DashboardStats } from '../schema/index.js';

export async function getCurrentDashboardStats(): Promise<DashboardStats | null> {
  const col = await getCollection('dashboardStats');
  return col.findOne({ _id: 'current' } as never) as Promise<DashboardStats | null>;
}

export async function upsertDashboardStats(doc: DashboardStats): Promise<void> {
  const col = await getCollection('dashboardStats');
  await col.replaceOne({ _id: 'current' } as never, doc as never, { upsert: true });
}
