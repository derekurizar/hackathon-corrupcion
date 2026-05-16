import { createRequire } from 'node:module';
import type { Readable, Duplex } from 'node:stream';
import type { GuatecomprasRecord } from '../ocds/index.js';

/**
 * `yauzl` and `stream-json` are CommonJS packages that use `export =` and ship
 * no `"exports"`/`"type":"module"`. Their shared transitive dep `stream-chain`
 * is NOT hoisted into the consumer's top-level `node_modules` under pnpm's
 * strict layout, so a direct `import 'stream-chain'` is not resolvable from
 * here. We therefore load these CJS modules via `createRequire` and wire the
 * pipeline with plain `node:stream` `.pipe()` (no `stream-chain` needed). The
 * archive shape (single `.json` entry, root key `records`) is confirmed in
 * `data-integestion/notes/zip-spike.md`.
 */
const require = createRequire(import.meta.url);

interface YauzlEntry {
  fileName: string;
}
interface YauzlZipFile {
  readEntry: () => void;
  openReadStream: (
    entry: YauzlEntry,
    cb: (err: Error | null, stream?: Readable) => void,
  ) => void;
  on: ((ev: 'entry', cb: (entry: YauzlEntry) => void) => void) &
    ((ev: 'end' | 'close', cb: () => void) => void) &
    ((ev: 'error', cb: (err: Error) => void) => void);
  close: () => void;
}
interface YauzlModule {
  open: (
    path: string,
    opts: { lazyEntries: boolean },
    cb: (err: Error | null, zip?: YauzlZipFile) => void,
  ) => void;
}

const yauzl = require('yauzl') as YauzlModule;
// `parser`/`pick`/`streamArray` are namespace members on the `export =`
// function of each CJS module (verified at runtime). Each returns a Duplex
// (Transform) so `.pipe()` chains and the final stage is async-iterable.
const { parser } = require('stream-json') as {
  parser: () => Duplex;
};
const { pick } = require('stream-json/filters/Pick') as {
  pick: (opts: { filter: string }) => Duplex;
};
const { streamArray } = require('stream-json/streamers/StreamArray') as {
  streamArray: () => Duplex;
};

/** Opens the ZIP and resolves a read stream over the single JSON entry. */
function openJsonEntryStream(zipPath: string): Promise<Readable> {
  return new Promise<Readable>((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true }, (err, zip) => {
      if (err || !zip) {
        reject(err ?? new Error(`yauzl: no zipfile handle for ${zipPath}`));
        return;
      }
      let found = false;
      zip.on('entry', (entry) => {
        if (found) return;
        if (!/\.json$/i.test(entry.fileName)) {
          zip.readEntry();
          return;
        }
        found = true;
        zip.openReadStream(entry, (rsErr, stream) => {
          if (rsErr || !stream) {
            reject(rsErr ?? new Error(`yauzl: no read stream for ${entry.fileName}`));
            return;
          }
          resolve(stream);
        });
      });
      zip.on('end', () => {
        if (!found) reject(new Error(`No .json entry found in ${zipPath}`));
      });
      zip.on('error', reject);
      zip.readEntry();
    });
  });
}

/**
 * Streams every `records[]` entry out of the month's ZIP, one record at a
 * time, with bounded memory — the ~200 MB JSON entry is never `JSON.parse`d
 * whole. Pipeline: zip entry → `parser()` → `pick({filter:'records'})` →
 * `streamArray()`; each emitted `{ key, value }` yields `value` as a
 * `GuatecomprasRecord`.
 */
export async function* streamRecords(
  zipPath: string,
): AsyncGenerator<GuatecomprasRecord> {
  const entryStream = await openJsonEntryStream(zipPath);
  const jsonParser = parser();
  const recordsFilter = pick({ filter: 'records' });
  const arrayStreamer = streamArray();

  // Propagate upstream errors onto the consumed (last) stream so the
  // for-await loop rejects instead of hanging.
  const fail = (e: Error): void => {
    arrayStreamer.destroy(e);
  };
  entryStream.on('error', fail);
  jsonParser.on('error', fail);
  recordsFilter.on('error', fail);

  entryStream.pipe(jsonParser).pipe(recordsFilter).pipe(arrayStreamer);

  for await (const chunk of arrayStreamer) {
    yield (chunk as { value: GuatecomprasRecord }).value;
  }
}
