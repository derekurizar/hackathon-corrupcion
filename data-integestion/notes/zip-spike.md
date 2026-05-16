# ZIP-structure spike — findings (Epic 4.0)

Run: `pnpm --dir data-integestion cli ingest --year 2026 --month 4 --spike`
Date: 2026-05-16 | Environment: local (network reachable).

## Result — confirmed live

| Question | Answer |
|---|---|
| HTTP status | `200 OK` |
| `content-type` | `application/zip` |
| Magic bytes | `50 4b 03 04` → **ZIP** (`PK\x03\x04` local file header) |
| Archive type | **ZIP**, NOT gzip, NOT raw JSON |
| Compressed size | 27,327,030 bytes (~27 MB) |
| Entries in archive | **1** |
| JSON entry name | `2026-04_Guatecompras.json` |
| Uncompressed entry size | 203,095,235 bytes (~203 MB) |
| JSON root keys | `uri, version, extensions, publishedDate, publisher, license, publicationPolicy, records` |
| Records array path | `records` at the **root** of the JSON object (not nested) |

First ~120 bytes of the JSON entry:

```text
{"uri":"https://ocds.guatecompras.gt/file/json/2026/4","version":"1.1","extensions":["https://raw.githubusercontent.com/
```

## Decisions locked for `backend/src/ingest/stream.ts`

1. **Archive = ZIP.** Open with `yauzl.open(path, { lazyEntries: true })`.
2. **One entry, name is date-stamped** (`<YYYY>-<MM>_Guatecompras.json`, the
   month here is zero-padded *inside the archive* even though the URL month is
   NOT). Do **not** hardcode the name — select the entry whose `fileName`
   matches `/\.json$/i` (the spike shows exactly one entry, and it is the
   JSON). This is resilient to the date-stamp / future single-entry archives.
3. **Root shape matches `GuatecomprasPackage`** in
   `backend/src/ocds/guatecompras-observed-types.ts` exactly — `records[]` is a
   top-level key. Stream filter = `Pick({ filter: 'records' })` →
   `streamArray()`; each `value` is a `GuatecomprasRecord`.
4. **Uncompressed entry is ~203 MB** — confirms the requirement to stream and
   never `JSON.parse` the whole entry. `yauzl` random-access + `stream-json`
   keeps memory bounded (one record at a time).
5. **`stream-json` + `yauzl` are CommonJS** (`export =`, `"main":"index.js"`,
   no `"exports"`, no `"type":"module"`). Their transitive type/runtime dep
   `stream-chain` is NOT hoisted into `data-integestion`/`backend` top-level
   `node_modules` under pnpm's strict layout, so `import 'stream-chain'`
   directly is NOT safe. `stream.ts` therefore uses `createRequire` to load
   `stream-json` (and `yauzl`) and pipes `parser → pick → streamArray` with
   plain `node:stream` `.pipe()` (no `stream-chain` dependency added).

## Verify command (network-required, completed)

`pnpm --dir data-integestion cli ingest --year 2026 --month 4 --spike` →
exit 0, output above. Re-runnable for any month.
