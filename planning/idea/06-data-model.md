# 06 — Data Model (MongoDB Atlas)

> **Atlas is external and pre-provisioned by the user. CDK/infra does NOT
> create or manage the cluster** — it only consumes `MONGODB_URI` from
> Secrets. This file is the **authoritative source** for the collections and
> indexes to create in the existing cluster.

Input types reused verbatim from `../assets/guatecompras_observed_types.ts`.
Shapes below are the **stored** (curated) types. **Money = `Number`
(float64)**, rounded to cents on read; dates = ISO strings with derived
`year`/`month`.

## Collections & indexes

### `curatedReleases` — one per OCDS record

Key **`ocid`**. Guarded keep-latest upsert (write only if incoming
`compiledRelease.date`/`publishedDate` ≥ stored — see `02`).

```jsonc
{
  "ocid": "ocds-xqjsxa-30095980",
  "id": "...", "date": "...", "year": 2026, "month": 5,
  "buyer": { "id": "GT-NIT:4132726", "name": "MUNICIPALIDAD ..." },
  "tender": {
    "id": "...", "title": "...", "statusDetails": "Adjudicado",
    "procurementMethodDetails": "Compra Directa con Oferta Electrónica (Art. 43 LCE Inciso b)",
    "mainProcurementCategory": "goods",
    "numberOfTenderers": 1,
    "datePublished": "...",
    "tenderPeriod": { "startDate": "...", "endDate": "..." | null },
    "items": [{ "classificationId": "81101513", "scheme": "UNSPSC",
                "description": "...", "quantity": 1, "unitName": "Unidad" }],
    "itemFamilies": ["8110"],            // 4-digit UNSPSC families (derived)
    "documentsSummary": { "count": 3, "types": ["purchaseRequest"],
                          "firstDatePublished": "..." }
  },
  "bids": [{ "status": "valid", "amount": 17940, "tendererId": "GT-NIT:7894880" }],
  "bidCounts": { "count": 4, "valid": 4, "disqualified": 0 },
  "awards": [{ "id": "...", "date": "...", "status": "active",
               "statusDetails": "Habilitado",
               "value": { "amount": 92000, "currency": "GTQ" },
               "supplierIds": ["GT-NIT:7894880"] }],
  "contracts": [{ "id": "...", "awardID": "...", "dateSigned": "...",
                  "value": { "amount": 896400, "currency": "GTQ" },
                  "period": { "start": "...", "end": "..." },
                  "documentsCount": 1, "contractNumber": "DAJ-040-2026" }],
  "region": "ALTA VERAPAZ"               // stored; UI is stretch
}
```
Indexes: `{ocid:1}` unique; `{ "buyer.id":1 }`;
`{ "awards.supplierIds":1 }`; `{ "tender.itemFamilies":1 }`;
`{ year:1, month:1 }`; `{ "tender.procurementMethodDetails":1 }`.

### `entities` — buyers & suppliers

Key: **canonical id** (`scheme:id`). **Names stored raw/verbatim.**

```jsonc
{ "_id": "GT-NIT:7894880", "name": "<raw>", "kind": "supplier" | "buyer",
  "entityType": "company" | "individual" | "unknown",
  "legalEntityTypeDetail": "<raw, when present>",
  "rollup": { "awardCount": 0, "awardValue": 0,
              "buyerIds": [], "categoryFamilies": [],
              "firstAwardDate": "...", "lastAwardDate": "...",
              "historyAvgValue": 0 } }
```
Indexes: `{ kind:1 }`, `{ entityType:1 }`, `{ "rollup.awardValue":-1 }`.
`unknown` is treated as *individual* (privacy-safe) by the anonymization step
in `04`.

### `benchmarks` — precomputed before detection

`_id` = scope label.

```jsonc
{ "_id": "scope:2025-08..2026-07",
  "periodScope": { "minMonth": "2025-08", "maxMonth": "2026-07" },
  "categoryPrice": { "<UNSPSC-family>": { "median": n, "p25": n, "p75": n,
                       "count": n, "level": "family|segment|mainCategory" } },
  "peerCategoryMedian": { "<UNSPSC-family>": n },
  "buyerMethodMix": { "<buyerId>": { "<methodDetails>": { "valueShare": 0..1,
                                     "countShare": 0..1 } } },
  "nationalMethodBaseline": { "Compra Directa ...": 0.945, ... } }
```

### `signals` — fired ContractSignals

```jsonc
{ "_id": "...", "ocid": "...", "caseKey": "...",
  "rule_id": "supplier_concentration_per_buyer", "family": "F2",
  "severity": "high", "confidence": 0.86,
  "primaryEntityId": "GT-NIT:4132726",       // ALWAYS buyer.id
  "secondaryEntityIds": ["GT-NIT:7894880"],
  "timeWindow": "2025-08..2026-07",          // scope label
  "title": "...", "explanation": "...", "story_angle": "...",
  "evidence": [{ "field": "awards.value.amount", "value": 12500000,
                 "comparison": "64% of buyer total", "benchmark": 19500000 }] }
```
Indexes: `{ caseKey:1 }`, `{ rule_id:1 }`, `{ family:1 }`, `{ ocid:1 }`.

### `investigations` — one canonical doc per `caseKey`

`caseKey = sha256(buyer.id | signalFamily | scope)`.

```jsonc
{ "_id": "<caseKey>",
  "buyer": { "id": "GT-NIT:4132726", "name": "MUNICIPALIDAD ..." },
  "supplier": { "id": "GT-NIT:7894880",
                "displayNameEs": "PROVEEDOR S.A." | "un proveedor individual",
                "displayNameEn": "PROVEEDOR S.A." | "an individual supplier",
                "isIndividual": false },
  "signalFamily": "F2",
  "timeWindow": "2025-08..2026-07",
  "reviewPriority": "high",
  "ruleIds": ["supplier_concentration_per_buyer", "single_bidder"],
  "signalIds": ["..."],
  "totalValue": 12500000, "currency": "GTQ",
  "es": { "headline": "...", "summary": "...",
          "sections": { "queEncontramos":"...", "porQueSeMarco":"...",
                        "laEvidencia":"...", "queSignificaYQueNo":"..." },
          "keyFindings": ["..."], "caveat": "..." },
  "en": { "headline": "...", "summary": "...",
          "sections": { "whatWeFound":"...", "whyFlagged":"...",
                        "theEvidence":"...", "whatItMeans":"..." },
          "keyFindings": ["..."], "caveat": "..." },
  "evidence": [ /* flattened, traceable */ ],
  "audio": { "es": "audio/<caseKey>/3/es.mp3",
             "en": "audio/<caseKey>/3/en.mp3" },
  "evidenceHash": "sha256...", "version": 3,
  "status": "published",
  "createdAt": "...", "updatedAt": "..." }
```
**Raw individual names never appear here or in any API payload.** `supplier`
display fields are computed at publish from `entities.entityType`
(company name verbatim, else localized "individual supplier"). `buyer` always
named. Indexes: `{ reviewPriority:1, updatedAt:-1 }`, `{ "buyer.id":1 }`,
`{ signalFamily:1 }`, `{ ruleIds:1 }`, `$text` on headlines/summaries (basic
`$text`, not Atlas Search).

### `editions` — featured "newspaper" issues

`_id` = publish-run sequence/timestamp (not a calendar month).

```jsonc
{ "_id": "run-2026-05-02T06:00:00Z", "publishedAt": "...",
  "leadCaseKey": "...", "highlightCaseKeys": ["...", "..."],
  "stats": { "count": 20, "totalValueFlagged": 0,
             "byFamily": { "F1":0,"F2":0,"F3":0,"F4":0 } } }
```
Newsroom queries **all** `investigations`; the Edition is the featured issue.
Index: `{ publishedAt:-1 }`.

### `dashboardStats` — single precomputed snapshot

Written by `Publish` so `GET /stats` is a single fast read (no ~209k-doc
aggregation per request).

```jsonc
{ "_id": "current", "computedAt": "...",
  "counters": { "records": 0, "valueAnalyzed": 0, "entities": 0,
                "monthsCovered": 0, "investigations": 0 },
  "methodBreakdown": { "Compra Directa ...": 0.945, ... },
  "byFamily": { "F1":0,"F2":0,"F3":0,"F4":0 },
  "priorityDist": { "high":0,"medium":0,"low":0 },
  "trend": [{ "month": "2026-05", "flagged": 0, "value": 0 }],
  "topBuyersByFlaggedValue": [{ "id": "...", "name": "...", "value": 0 }] }
```

### `pipelineRuns` — run metadata & idempotency

```jsonc
{ "_id": "run-...", "startedAt": "...", "finishedAt": "...",
  "monthsRequested": [{ "year":2026,"month":5 }],
  "toggles": { "INGEST_ONLY": false, "runBenchmarks": true, ... },
  "stages": { "ingest": "ok", "benchmarks": "ok", "detection":"ok",
              "story":"ok","audio":"ok","publish":"ok" },
  "counts": { "recordsIngested": 0, "signals": 0, "investigations": 0 },
  "errors": [] }
```

## Notes

- All `value.amount` fields are `Number` (float64); GTQ magnitudes (≤ tens of
  millions, 2 decimals) are exact within float64.
- Re-ingesting/re-running is safe: guarded keep-latest upsert + `evidenceHash`
  skip + counters computed from collections / the `dashboardStats` snapshot.
