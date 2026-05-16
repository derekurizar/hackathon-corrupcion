# 06 — Data Model (MongoDB Atlas)

Input types reused verbatim from `../assets/guatecompras_observed_types.ts`.
The shapes below are the **stored** (curated) types. Money = decimal-safe
number + currency; dates = ISO strings with derived `year`/`month`.

## `curatedReleases` — one per OCDS record

Key: **`ocid`** (unique). Idempotent `replaceOne(upsert)` — re-ingest safe.

```jsonc
{
  "ocid": "ocds-xqjsxa-30095980",         // unique key
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
    "documentsSummary": { "count": 3, "types": ["purchaseRequest"],
                          "firstDatePublished": "..." }
  },
  "bidsSummary": { "count": 4, "validCount": 4, "disqualifiedCount": 0,
                   "tendererIds": ["GT-NIT:7894880", ...],
                   "amounts": [17940, 92000] } | null,
  "awards": [{ "id": "...", "date": "...", "status": "active",
               "statusDetails": "Habilitado",
               "value": { "amount": 92000, "currency": "GTQ" },
               "supplierIds": ["GT-NIT:7894880"] }],
  "contracts": [{ "id": "...", "awardID": "...", "dateSigned": "...",
                  "value": { "amount": 896400, "currency": "GTQ" },
                  "period": { "start": "...", "end": "..." },
                  "documentsCount": 1, "contractNumber": "DAJ-040-2026" }],
  "region": "ALTA VERAPAZ"                // stored; UI is stretch
}
```
Indexes: `{ocid:1}` unique; `{ "buyer.id":1 }`;
`{ "awards.supplierIds":1 }`; `{ "tender.items.classificationId":1 }`;
`{ year:1, month:1 }`; `{ "tender.procurementMethodDetails":1 }`.

## `entities` — buyers & suppliers

Key: **canonical id** (`scheme:id`).

```jsonc
{ "_id": "GT-NIT:7894880", "name": "...", "kind": "supplier" | "buyer",
  "entityType": "INDIVIDUAL" | "SOCIEDAD ANÓNIMA" | ... | null,
  "rollup": { "awardCount": 0, "awardValue": 0,
              "buyerIds": [], "categoryIds": [],
              "firstAwardDate": "...", "lastAwardDate": "...",
              "historyAvgValue": 0 } }
```
Index: `{ kind:1 }`, `{ "rollup.awardValue":-1 }`.

## `benchmarks` — precomputed before detection

```jsonc
{ "_id": "scope:2026",
  "periodScope": { "minMonth": "2026-01", "maxMonth": "2026-12" },
  "categoryPrice": { "<UNSPSC>": { "median": n, "p25": n, "p75": n,
                                   "count": n } },
  "peerCategoryMedian": { "<UNSPSC>": n },
  "buyerMethodMix": { "<buyerId>": { "<methodDetails>": { "valueShare": 0..1,
                                     "countShare": 0..1 } } },
  "nationalMethodBaseline": { "Compra Directa ...": 0.945, ... } }
```

## `signals` — fired ContractSignals

```jsonc
{ "_id": "...", "ocid": "...", "caseKey": "...",
  "rule_id": "supplier_concentration_per_buyer", "family": "F2",
  "severity": "high", "confidence": 0.86,
  "primaryEntityId": "GT-NIT:4132726", "timeWindow": "2026",
  "title": "...", "explanation": "...", "story_angle": "...",
  "evidence": [{ "field": "awards.value.amount", "value": 12500000,
                 "comparison": "64% of buyer total", "benchmark": 19500000 }] }
```
Indexes: `{ caseKey:1 }`, `{ rule_id:1 }`, `{ family:1 }`.

## `investigations` — one canonical doc per `caseKey`

```jsonc
{ "_id": "<caseKey>",
  "primaryEntityId": "GT-NIT:4132726", "signalFamily": "F2",
  "timeWindow": "2026",
  "reviewPriority": "high",
  "signalIds": ["..."], "ruleIds": ["..."],
  "es": { "headline": "...", "summary": "...", "sections": [...],
          "keyFindings": ["..."], "caveat": "..." },
  "en": { ... },
  "evidence": [ /* flattened, traceable */ ],
  "buyer": { "id": "...", "name": "..." },
  "supplier": { "id": "...", "name": "..." },
  "totalValue": 12500000, "currency": "GTQ",
  "audio": { "es": "audio/<caseKey>/3/es.mp3",
             "en": "audio/<caseKey>/3/en.mp3" },
  "evidenceHash": "sha256...", "version": 3,
  "status": "published",
  "createdAt": "...", "updatedAt": "..." }
```
Indexes: `{ reviewPriority:1, updatedAt:-1 }`, `{ "buyer.id":1 }`,
`{ signalFamily:1 }`, text index on headlines/summaries for search.
`caseKey` + `evidenceHash` semantics match `04` (dedup) exactly.

## `editions` — periodic "newspaper" issues

```jsonc
{ "_id": "2026-05", "publishedAt": "...",
  "investigationCaseKeys": ["...", "..."], "leadCaseKey": "...",
  "stats": { "count": 20, "totalValueFlagged": 0,
             "byFamily": { "F1":0,"F2":0,"F3":0,"F4":0 } } }
```

## `pipelineRuns` — run metadata & dashboard source

```jsonc
{ "_id": "run-...", "startedAt": "...", "finishedAt": "...",
  "monthsRequested": [{ "year":2026,"month":5 }],
  "stages": { "ingest": "ok", "benchmarks": "skipped",
              "detection":"ok","story":"ok","audio":"ok","publish":"ok" },
  "counts": { "recordsIngested": 0, "signals": 0,
              "investigations": 0 },
  "errors": [] }
```

Dashboard totals are **computed from `curatedReleases`/`investigations`**
(aggregation), not by incrementing counters — so re-ingesting a month never
double-counts.
