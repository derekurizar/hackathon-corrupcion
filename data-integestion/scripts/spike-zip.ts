/**
 * Epic 4.0 — ZIP-structure spike.
 *
 * Downloads the un-padded Guatecompras monthly URL and reports the on-disk
 * archive format so the streaming code (`backend/src/ingest/stream.ts`) can be
 * locked to the real shape. This is a one-shot diagnostic, NOT part of the
 * production ingest path.
 *
 * Run via: `pnpm --dir data-integestion cli ingest --year <Y> --month <M> --spike`
 *
 * Findings are recorded in `data-integestion/notes/zip-spike.md` (this script
 * only prints; the human/agent transcribes the result into the notes file).
 */
import { createRequire } from 'node:module';
import { createWriteStream, createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const require = createRequire(import.meta.url);
// stream-json + yauzl are CommonJS (`export =`); load via createRequire so the
// NodeNext ESM resolver does not need bundler-style interop guesses.
type YauzlEntry = {
  fileName: string;
  compressedSize: number;
  uncompressedSize: number;
};
type YauzlZipFile = {
  readEntry: () => void;
  openReadStream: (
    entry: YauzlEntry,
    cb: (err: Error | null, stream?: NodeJS.ReadableStream) => void,
  ) => void;
  on: (ev: string, cb: (...a: unknown[]) => void) => void;
};
const yauzl = require('yauzl') as {
  open: (
    path: string,
    opts: { lazyEntries: boolean },
    cb: (err: Error | null, zip?: YauzlZipFile) => void,
  ) => void;
};

function monthlyUrl(year: number, month: number): string {
  return `https://ocds.guatecompras.gt/file/json/${year}/${month}`;
}

async function readFirstBytes(path: string, n: number): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let total = 0;
  const rs = createReadStream(path, { start: 0, end: n - 1 });
  for await (const chunk of rs) {
    chunks.push(chunk as Buffer);
    total += (chunk as Buffer).length;
    if (total >= n) break;
  }
  return Buffer.concat(chunks).subarray(0, n);
}

function magicLabel(magic: Buffer): string {
  // PK\x03\x04 = local file header (zip). PK\x05\x06 = empty zip EOCD.
  if (magic[0] === 0x50 && magic[1] === 0x4b) return 'ZIP (PK..)';
  if (magic[0] === 0x1f && magic[1] === 0x8b) return 'GZIP (1f 8b)';
  if (magic[0] === 0x7b || magic[0] === 0x5b) return 'RAW JSON ({ or [)';
  return 'UNKNOWN';
}

export async function runSpike(year: number, month: number): Promise<void> {
  const url = monthlyUrl(year, month);
  const destPath = `${tmpdir()}/gc-spike-${year}-${month}.bin`;
  console.log(`[spike] URL: ${url}`);
  console.log(`[spike] dest: ${destPath}`);

  const resp = await fetch(url);
  console.log(`[spike] HTTP ${resp.status} ${resp.statusText}`);
  console.log(`[spike] content-type: ${resp.headers.get('content-type')}`);
  console.log(
    `[spike] content-length: ${resp.headers.get('content-length') ?? '(chunked)'}`,
  );
  if (!resp.ok || !resp.body) {
    throw new Error(`[spike] no usable body — HTTP ${resp.status}`);
  }
  await pipeline(
    Readable.fromWeb(resp.body as Parameters<typeof Readable.fromWeb>[0]),
    createWriteStream(destPath),
  );

  const { size } = await stat(destPath);
  const magic = await readFirstBytes(destPath, 4);
  console.log(`[spike] file size: ${size} bytes`);
  console.log(
    `[spike] magic bytes: ${[...magic]
      .map((b) => b.toString(16).padStart(2, '0'))
      .join(' ')} → ${magicLabel(magic)}`,
  );

  if (!(magic[0] === 0x50 && magic[1] === 0x4b)) {
    console.log(
      '[spike] NOT a zip — inspect manually (gzip/raw). Aborting entry walk.',
    );
    return;
  }

  await new Promise<void>((resolve, reject) => {
    yauzl.open(destPath, { lazyEntries: true }, (err, zip) => {
      if (err || !zip) return reject(err ?? new Error('no zipfile handle'));
      const entries: YauzlEntry[] = [];
      zip.on('entry', (e: unknown) => {
        const entry = e as YauzlEntry;
        entries.push(entry);
        console.log(
          `[spike] entry: ${entry.fileName} (compressed=${entry.compressedSize}, uncompressed=${entry.uncompressedSize})`,
        );
        const isJson = /\.json$/i.test(entry.fileName);
        if (!isJson) {
          zip.readEntry();
          return;
        }
        zip.openReadStream(entry, (rsErr, stream) => {
          if (rsErr || !stream) {
            zip.readEntry();
            return;
          }
          let head = '';
          stream.on('data', (c: Buffer) => {
            if (head.length < 8192) head += c.toString('utf8');
          });
          stream.on('end', () => {
            const slice = head.slice(0, 8192);
            const rootKeys = [...slice.matchAll(/"([a-zA-Z]+)"\s*:/g)]
              .map((m) => m[1])
              .slice(0, 12);
            console.log(`[spike] JSON head (first ~120 chars): ${slice.slice(0, 120)}`);
            console.log(`[spike] observed early root-ish keys: ${rootKeys.join(', ')}`);
            console.log(
              `[spike] records[] present in head: ${slice.includes('"records"')}`,
            );
            zip.readEntry();
          });
          stream.on('error', () => zip.readEntry());
        });
      });
      zip.on('end', () => {
        console.log(`[spike] total entries: ${entries.length}`);
        resolve();
      });
      zip.on('error', reject);
      zip.readEntry();
    });
  });

  console.log(
    '[spike] DONE. Record findings in data-integestion/notes/zip-spike.md',
  );
}
