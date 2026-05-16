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

Each file is large (~100 MB+, observed sample 111 MB, ~17.4k records/month).
A year ≈ ~209k records, ~700k tender documents, ~1M item attributes — most of
which we **discard** (see selective extraction).

## Input contract

Ingestion is **month-parameterized**: `{ year: number, month: number }`. The
operator runs it repeatedly (one invocation per month) to accumulate ~1 year.
EventBridge passes the most recent month on schedule; manual invokes pass any
`{year,month}` and may set `INGEST_ONLY` to bulk-load before processing.

## Step Functions fan-out

`ResolveMonths` produces the list of `{year,month}` targets → `Map:
IngestMonth` runs one Lambda per month (bounded concurrency). One month per
Lambda invocation keeps each run well under the **15 min / 10 GB** cap.

## Per-month Lambda: stream + selective extraction

The file is too big to `JSON.parse` in memory. Stream it:

- Fetch with a streaming HTTP client; pipe into a streaming JSON parser
  (`stream-json` / `Big-JSON`) over `records[]`.
- For each `record.compiledRelease`, extract **only detection-relevant
  fields**. **Drop** the huge noise arrays:
  - `tender.documents[]` → keep only `count` + set of `documentType`s + min
    `datePublished` (for the "missing/weak docs" rule).
  - `tender.items[].attributes[]` → **drop entirely** (free text, ~1M/yr).
  - `tender.items[]` → keep `classification.id` (UNSPSC), `classification.scheme`,
    short `description`, `quantity`, `unit.name`.
- Optionally write the raw monthly file to S3 `raw-cache` first so re-runs and
  debugging don't re-download 100 MB.

### Fields kept per curated release (drives every rule)

```txt
ocid, id, date, publishedDate
buyer { id, name }
tender {
  id, title, statusDetails, procurementMethodDetails,
  mainProcurementCategory, numberOfTenderers,
  datePublished, tenderPeriod.startDate, tenderPeriod.endDate?,
  items: [{ classificationId, scheme, description, quantity, unitName }],
  documentsSummary { count, types[], firstDatePublished? }
}
bids.detailsSummary { count, validCount, disqualifiedCount,
                       tendererIds[], amounts[] }
awards: [{ id, date, status, statusDetails, value{amount,currency},
           supplierIds[] }]
contracts: [{ id, awardID, dateSigned, value{amount,currency},
              period{start,end}, documentsCount, contractNumber }]
region   // from parties[].address.region of buyer (stored, UI is stretch)
```

Use the existing `../assets/guatecompras_observed_types.ts` verbatim as the
**input** types; the curated shape above is the **stored** type
(see `06-data-model.md`).

## Normalization & entity resolution

- **Canonical entity id** = `identifier.scheme + ':' + identifier.id` (e.g.
  `GT-NIT:7894880`, `GT-GCID:CO-0D13...`). All grouping (concentration, repeat
  winners, splitting) joins on this id — **never on names** (names are dirty,
  e.g. `DE LEON,MALDONADO,,CESAR,AUGUSTO`).
- **Entity type**: company vs individual via
  `parties[].details.legalEntityTypeDetail.description`
  (`INDIVIDUAL` vs `SOCIEDAD ANÓNIMA`/etc.) and `entityType`/`level`.
- Money: store `amount` as a decimal-safe number + `currency` (always `GTQ`
  observed). Dates: keep ISO strings; derive `year`, `month` for windowing.
- Build/update an `entities` upsert per buyer & supplier seen (rollups updated
  incrementally or recomputed in `BuildBenchmarks`).

## Idempotency (critical — re-runs accumulate, never duplicate)

- `curatedReleases` upserted by `ocid` (`replaceOne(..., {upsert:true})`).
- `entities` upserted by canonical id.
- A `pipelineRuns` doc records `{year,month}` ingested + counts; dashboard
  totals are computed from `curatedReleases`, not by incrementing counters, so
  re-ingesting a month is safe.

## Stage toggles

`Map: IngestMonth` always runs when invoked. `INGEST_ONLY=true` (or all
`run*` flags false) makes Step Functions skip `BuildBenchmarks` →
`Publish`, so the operator can load many months first, then run one full
pass. See `07-pipeline.md` for the Choice-state wiring.

## Failure handling

- Per-month task: retry with backoff (network/streaming failures), `Catch` to
  a failure-collector so one bad month doesn't abort the whole `Map`.
- Partial success allowed: benchmarks/detection run over whatever months are
  present in the DB.
