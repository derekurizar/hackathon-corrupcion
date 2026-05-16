import type { Collection } from 'mongodb';
import { getDb } from './client.js';
import type {
  CuratedRelease,
  Entity,
  Benchmark,
  Signal,
  Investigation,
  Edition,
  DashboardStats,
  PipelineRun,
} from '../schema/index.js';

export const COLLECTIONS = [
  'curatedReleases',
  'entities',
  'benchmarks',
  'signals',
  'investigations',
  'editions',
  'dashboardStats',
  'pipelineRuns',
] as const;

export type CollectionName = (typeof COLLECTIONS)[number];

type DocFor<N extends CollectionName> = N extends 'curatedReleases'
  ? CuratedRelease
  : N extends 'entities'
    ? Entity
    : N extends 'benchmarks'
      ? Benchmark
      : N extends 'signals'
        ? Signal
        : N extends 'investigations'
          ? Investigation
          : N extends 'editions'
            ? Edition
            : N extends 'dashboardStats'
              ? DashboardStats
              : N extends 'pipelineRuns'
                ? PipelineRun
                : never;

export async function getCollection<N extends CollectionName>(
  name: N,
): Promise<Collection<DocFor<N>>> {
  const db = await getDb();
  return db.collection<DocFor<N>>(name);
}
