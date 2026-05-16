# 02 — Data Ingestion

## Source

Guatecompras OCDS monthly files:

```txt
https://ocds.guatecompras.gt/file/json/{YEAR}/{MONTH}
```

⚠️ **Month is NOT zero-padded**: April 2026 → `.../2026/4` (not `/04`).

```ts
const monthlyUrl = (year: number, month: number) =>
  `https://ocds.guatecompras.gt/file/json/${year}/${month}`;
```

⚠️ **The URL returns a ZIP archive**, not raw JSON. Inside is one large JSON
file (~100 MB+ uncompressed; observed sample 111 MB, ~17.4k records/month).
A year ≈ ~209k records, ~700k tender documents, ~1M item attributes — most of
which we **discard** (see selective extraction).

## Input contract

Ingestion is **month-parameterized**: `{ year: number, month: number }`. The
operator runs it repeatedly (one invocation per month) to accumulate ~1 year.
EventBridge passes the most recent month on schedule; manual invokes pass any
`{year,month}` and may set `INGEST_ONLY` to bulk-load before processing.

## Step Functions fan-out

`ResolveMonths` produces the list of `{year,month}` targets → `Map:
IngestMonth` runs one Lambda per month (standard `Map`, bounded concurrency).
One month per Lambda invocation keeps each run well under the **15 min /
10 GB** cap.

## Per-month Lambda: zip → /tmp → stream

The compressed download is modest; the uncompressed JSON is too big to
`JSON.parse` in memory. Process it as:

1. **Download the zip** to Lambda `/tmp` (well under the 10 GB ephemeral cap;
   the compressed size also helps the 15-min budget). **No S3 cache.**
2. **Open the zip with `yauzl`** (random-access; reliable for a single large
   entry) and obtain a read stream for the JSON entry.
3. **Stream-parse** that entry with `stream-json` over `records[]`.
4. For each `record.compiledRelease`, extract **only detection-relevant
   fields**. **Drop** the huge noise arrays:
   - `tender.documents[]` → keep only `count` + set of `documentType`s + min
     `datePublished` (for the "missing/weak docs" rule).
   - `tender.items[].attributes[]` → **drop entirely** (free text, ~1M/yr).
   - `tender.items[]` → keep `classification.id` (UNSPSC),
     `classification.scheme`, short `description`, `quantity`, `unit.name`.

### Fields kept per curated release (drives every rule)

```txt
ocid, id, date, publishedDate, year, month
buyer { id, name }
tender {
  id, title, statusDetails, procurementMethodDetails,
  mainProcurementCategory, numberOfTenderers,
  datePublished, tenderPeriod.startDate, tenderPeriod.endDate?,
  items: [{ classificationId, scheme, description, quantity, unitName }],
  itemFamilies: [<4-digit UNSPSC families, derived>],
  documentsSummary { count, types[], firstDatePublished? }
}
bids: [{ status, amount, tendererId }]            // one entry per bid
bidCounts { count, valid, disqualified }          // derived convenience
awards: [{ id, date, status, statusDetails, value{amount,currency},
           supplierIds[] }]
contracts: [{ id, awardID, dateSigned, value{amount,currency},
              period{start,end}, documentsCount, contractNumber }]
region   // from the buyer party's address.region (stored; UI is stretch)
```

`bids` keeps one compact entry per bid (`{ status, amount, tendererId }`,
avg 2.1, max 23) so rules 5/10/17 retain the status→amount→tenderer linkage.
Money `amount` = `Number` (float64). Use
`../assets/guatecompras_observed_types.ts` verbatim as the **input** types;
the curated shape above is the **stored** type (see `06-data-model.md`).

## Normalization & entity resolution

- **Canonical entity id** = `identifier.scheme + ':' + identifier.id` (e.g.
  `GT-NIT:7894880`, `GT-GCID:CO-0D13...`). All grouping (concentration, repeat
  winners, splitting) joins on this id — **never on names**.
- **Entity names are stored raw / verbatim.** No masking at ingestion.
  Anonymization of natural persons happens at the LLM/story layer (`04`).
- **Entity type hint** per entity: use
  `parties[].details.legalEntityTypeDetail.description` when present (~41.7%);
  else infer from a name-pattern / keyword heuristic
  (`LASTNAME,LASTNAME,,FIRSTNAME,` ⇒ individual; `S.A.`/`SOCIEDAD ANÓNIMA`/
  `COOPERATIVA` ⇒ company); else `unknown`. **`unknown` is treated as
  individual (privacy-safe) by the anonymization step.** Stored as
  `entities.entityType` (`company | individual | unknown`) plus the raw
  `legalEntityTypeDetail`.
- Money: `Number` + `currency` (always `GTQ` observed). Dates: keep ISO
  strings; derive `year`, `month` for the dashboard trend.
- Upsert an `entities` doc per buyer & supplier seen; rollups recomputed in
  `BuildBenchmarks`.

## Idempotency — keep latest, never duplicate

- `curatedReleases` keyed by `ocid`. The same `ocid` reappears across monthly
  files as a tender progresses (tender → award → contract). **Guarded
  upsert:** write only if the incoming `compiledRelease.date` (fallback
  `publishedDate`) is **≥ the stored value**. This keeps the most complete
  state and makes re-ingesting any month, in any order, safe.
- `entities` upserted by canonical id.
- A `pipelineRuns` doc records `{year,month}` ingested + counts. Dashboard
  totals are computed from `curatedReleases`/`investigations` (or the
  precomputed `dashboardStats` snapshot — see `07`), not by incrementing
  counters, so re-ingesting a month is safe.

## Stage toggles

`Map: IngestMonth` always runs when invoked. `INGEST_ONLY=true` (or all
`run*` flags false) makes Step Functions skip `BuildBenchmarks` →
`Publish`, so the operator can bulk-load many months first, then run one full
pass. See `07-pipeline.md` for the Choice-state wiring.

## Failure handling

- Per-month task: retry with backoff (network/stream/unzip failures), `Catch`
  to a failure-collector so one bad month doesn't abort the whole `Map`.
- Partial success allowed: benchmarks/detection run over whatever months are
  present in the DB.
