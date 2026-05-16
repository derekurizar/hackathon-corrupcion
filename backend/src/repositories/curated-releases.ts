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

/**
 * Pure intra-batch dedup: collapse multiple records with the same `ocid` to
 * keep-latest (via `shouldReplace`). `bulkWrite` ops don't observe each other,
 * so without this an earlier op with a later date could be blindly overwritten
 * by a later op with an earlier date. Order of returned candidates is not
 * significant (filtered against stored dates downstream).
 */
export function collapseByOcidKeepLatest(
  docs: CuratedRelease[],
): CuratedRelease[] {
  const byOcid = new Map<string, CuratedRelease>();
  for (const d of docs) {
    const prev = byOcid.get(d.ocid);
    if (!prev || shouldReplace(d, prev)) byOcid.set(d.ocid, d);
  }
  return [...byOcid.values()];
}

export async function upsertCuratedRelease(doc: CuratedRelease): Promise<void> {
  const col = await getCollection('curatedReleases');
  const existing = await col.findOne({ ocid: doc.ocid } as never, {
    projection: { date: 1 },
  });
  if (!shouldReplace(doc, existing as Pick<CuratedRelease, 'date'> | null)) return;
  await col.replaceOne({ ocid: doc.ocid } as never, doc as never, { upsert: true });
}

/**
 * Bulk variant of `upsertCuratedRelease` — same keep-latest-by-`ocid`
 * semantics (`shouldReplace`) in one batch, with one read + one write
 * round-trip instead of N. Unordered so an unrelated op failure never aborts
 * the batch.
 */
export async function bulkUpsertCuratedReleases(
  docs: CuratedRelease[],
): Promise<void> {
  if (docs.length === 0) return;
  const col = await getCollection('curatedReleases');

  // Intra-batch dedup: collapse multiple records with the same ocid to
  // keep-latest. bulkWrite ops don't observe each other, so without this the
  // second op would blindly overwrite regardless of date.
  const candidates = collapseByOcidKeepLatest(docs);
  const ocids = candidates.map((d) => d.ocid);

  // Fetch existing dates in one query (mirrors the findOne projection in
  // upsertCuratedRelease).
  const existing = (await col
    .find({ ocid: { $in: ocids } } as never, { projection: { ocid: 1, date: 1 } })
    .toArray()) as Array<Pick<CuratedRelease, 'ocid' | 'date'>>;
  const storedDate = new Map(existing.map((e) => [e.ocid, { date: e.date }]));

  const ops = candidates
    .filter((d) => shouldReplace(d, storedDate.get(d.ocid) ?? null))
    .map((d) => ({
      replaceOne: { filter: { ocid: d.ocid }, replacement: d, upsert: true },
    }));
  if (ops.length === 0) return;
  await col.bulkWrite(ops as never[], { ordered: false });
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
