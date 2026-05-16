import type { WithId } from 'mongodb';
import { getCollection } from '../db/collections.js';
import type { CuratedRelease } from '../schema/index.js';

/**
 * Pure predicate: returns true if the incoming doc should overwrite the stored one.
 * Rule: incoming.date >= stored.date (both ISO strings; keep-latest is idempotent
 * on equal dates). Also returns true when no stored doc exists (null/undefined).
 */
export function shouldReplace(
  incoming: Pick<CuratedRelease, 'date'>,
  stored: Pick<CuratedRelease, 'date'> | null | undefined,
): boolean {
  if (!stored) return true;
  return incoming.date >= stored.date;
}

export async function upsertCuratedRelease(doc: CuratedRelease): Promise<void> {
  const col = await getCollection('curatedReleases');
  const existing = await col.findOne({ ocid: doc.ocid } as never, {
    projection: { date: 1 },
  });
  if (!shouldReplace(doc, existing as Pick<CuratedRelease, 'date'> | null)) return;
  await col.replaceOne({ ocid: doc.ocid } as never, doc as never, { upsert: true });
}

export async function getByOcid(ocid: string): Promise<WithId<CuratedRelease> | null> {
  const col = await getCollection('curatedReleases');
  return col.findOne({ ocid } as never) as Promise<WithId<CuratedRelease> | null>;
}

/**
 * Streams every curated release in the scope (Area 05). The scope is a single
 * full ingested window (idea/03 §"Window"), so there is no per-month filter —
 * the whole `curatedReleases` collection IS the scope. NEVER `.toArray()` this
 * cursor: callers iterate one document at a time to keep memory bounded.
 *
 * `filter.scope` is accepted for forward-compat / symmetry with the benchmark
 * `_id` but is not used to filter (the corpus is the scope by construction).
 */
export async function* iterateCuratedReleases(filter: {
  scope?: string;
}): AsyncGenerator<CuratedRelease> {
  void filter.scope;
  const col = await getCollection('curatedReleases');
  const cursor = col.find({} as never);
  for await (const doc of cursor) {
    yield doc as unknown as CuratedRelease;
  }
}
