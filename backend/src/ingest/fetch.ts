import { pipeline } from 'node:stream/promises';
import { createWriteStream } from 'node:fs';
import { tmpdir } from 'node:os';
import { Readable } from 'node:stream';

/**
 * Guatecompras monthly OCDS file URL.
 *
 * IMPORTANT: the month is **NOT zero-padded** in the URL (April 2026 →
 * `.../2026/4`, never `/04`). The zero-padded form appears only *inside* the
 * archive entry name (see `data-integestion/notes/zip-spike.md`).
 */
export function monthlyUrl(year: number, month: number): string {
  return `https://ocds.guatecompras.gt/file/json/${year}/${month}`;
}

/**
 * Downloads the month's ZIP archive to `destDir` (default `os.tmpdir()`,
 * i.e. Lambda `/tmp`) and returns the on-disk path. Streams the response body
 * straight to disk — never buffers the whole archive in memory. No S3 cache.
 *
 * Throws (so `withRetry` can back off) on non-2xx or a missing body.
 */
export async function downloadMonth(
  year: number,
  month: number,
  destDir = tmpdir(),
): Promise<string> {
  const url = monthlyUrl(year, month);
  const destPath = `${destDir}/gc-${year}-${month}.zip`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`HTTP ${resp.status} fetching ${url}`);
  if (!resp.body) throw new Error(`No response body for ${url}`);
  await pipeline(
    Readable.fromWeb(resp.body as Parameters<typeof Readable.fromWeb>[0]),
    createWriteStream(destPath),
  );
  return destPath;
}
