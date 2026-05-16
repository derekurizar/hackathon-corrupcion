# 03 — Detection Rules

Detection is **deterministic and pluggable**. Rules never call an LLM. They
read normalized data + precomputed benchmarks and emit `ContractSignal`s with
exact evidence. The LLM (`04`) only narrates what rules produced.

## Rule engine contract

```ts
type RuleContext = {
  release: CuratedRelease;          // one normalized record (see 06)
  benchmarks: Benchmarks;           // precomputed, see below
  entities: EntityIndex;            // canonical-id lookups + rollups
  config: RuleConfig;               // thresholds, all tunable in one place
};

type Rule = {
  id: string;                       // e.g. "single_bidder"
  family: "F1" | "F2" | "F3" | "F4";
  needsHistory: boolean;            // true ⇒ requires cross-month data
  run: (ctx: RuleContext) => ContractSignal[];
};

type ContractSignal = {
  signal_id: string;
  rule_id: string;
  family: "F1" | "F2" | "F3" | "F4";
  title: string;                    // i18n key (ES/EN)
  severity: "low" | "medium" | "high";
  confidence: number;               // 0..1, deterministic (see formula)
  explanation: string;              // i18n key + interpolated values
  evidence: {
    field: string;                  // exact OCDS path used
    value: unknown;
    comparison?: string;            // e.g. "4.6x family median"
    benchmark?: unknown;
  }[];
  story_angle: string;              // seed for the LLM
  primaryEntityId: string;          // ALWAYS buyer.id (see below)
  secondaryEntityIds?: string[];    // supplier(s) etc. (anonymized later)
  timeWindow: string;               // the scope label (see Window)
};
```

`primaryEntityId` is **always `buyer.id`** for every rule (institution-centric;
the accountable institution). Suppliers are *secondary* actors. Rules are
registered in an array; adding a rule = add one module. **All thresholds live
in `RuleConfig`** (no magic numbers in rule bodies).

`confidence = clamp01((metric − threshold) / scale)` with a per-rule `scale`
documented in `RuleConfig`.

## Window

A **single full ingested scope**. `timeWindow` is the scope label
(e.g. `"2025-08..2026-07"`) — identical for all signals/cases. Benchmarks and
all history-based rules are computed over this full scope. (No per-year /
per-quarter windows.)

## Category resolution (UNSPSC)

- `tender.items[].classification.id` is an 8-digit UNSPSC code. Benchmark at
  the **4-digit family** level. If a family has `n < CATEGORY_MIN_SAMPLE`
  samples, fall back to the **2-digit segment**, then to
  `mainProcurementCategory` (goods/services/works).
- An **award's category** = the **most-frequent UNSPSC family among the
  tender's items** (tie-break: first item). Stored as `tender.itemFamilies`
  during ingestion.

## Benchmark stage (runs before detection)

Computed once over the full scope, written to `benchmarks` (`06`):

- **Category price stats** per UNSPSC family (median, IQR p25/p75, count),
  with the fallback level recorded.
- **Buyer method mix**: per `buyer.id`, share of awarded value & count by
  `procurementMethodDetails`; national baseline (≈94.5% `Compra Directa`).
- **Peer baselines**: peer-buyer median price per family.
- **Supplier rollups**: per canonical supplier id — awards count/value, set of
  buyers, set of UNSPSC families, first/last award date, history avg.
- **Buyer rollups**: per `buyer.id` — total awarded value, supplier shares.
- **Period scope**: min/max month covered (the scope label).

## Risk presentation: Review Priority, no score

Users see a **Review Priority** badge + the list of fired signals. No
composite numeric score is shown.

```txt
review_priority =
  "high"   if any high-severity signal OR ≥3 medium signals
  "medium" if any medium-severity signal OR ≥2 low signals
  "low"    otherwise
```

(Internal `confidence` may inform top-N ranking — see `04` — but is never
surfaced as a public "corruption score".)

## Default RuleConfig (documented, tunable)

Ships with concrete starter values so the engine fires out-of-the-box. All
values live in one `RuleConfig` object. **Guatemala LCE legal bands** (GTQ):

```ts
LCE_COMPRA_DIRECTA_MAX = 90_000     // ≤ Q90k: direct purchase (Art. 43)
LCE_COTIZACION_MAX     = 900_000    // Q90k–Q900k: cotización (Art. 38)
// > Q900k: licitación pública (Art. 17)
CATEGORY_MIN_SAMPLE    = 8          // min n before UNSPSC-level fallback
```

| Rule | Starter defaults |
|---|---|
| 1 single_bidder | `numberOfTenderers ≤ 1`; sev med if value ≥ 90k, high if ≥ 900k |
| 2 low_competition_vs_category | `numberOfTenderers < family p25` AND ≤ 2 |
| 3 direct_award_overreliance | direct value-share ≥ 0.98 AND directValue ≥ 1M AND ≥ 5 awards |
| 4 highvalue_noncompetitive_method | value ≥ 900k AND method ∈ Art43/44/54 set → high |
| 5 disqualification_clears_field | ≥ 3 bids, exactly 1 valid post-DQ, that bidder wins → high |
| 6 failed_then_single_award | best-effort (see caveat); low confidence |
| 7 supplier_concentration_per_buyer **(HERO)** | top-supplier value-share ≥ 0.50 (high ≥ 0.65) AND buyer total ≥ 1M AND ≥ 5 awards |
| 8 buyer_dependence_on_supplier | top-supplier count-share ≥ 0.50 AND ≥ 5 awards |
| 9 supplier_cross_categories | ≥ 4 distinct UNSPSC families AND total ≥ 500k |
| 10 repeat_winner_same_competitors | tenderer-set (≥2) recurs ≥ 3 AND one wins ≥ 70% |
| 11 new_supplier_large_first_award | first award in scope AND ≥ 900k |
| 12 individual_large_contract | entityType individual AND value ≥ individual-cohort p90 AND ≥ 90k |
| 13 price_outlier_vs_category | value > family p75 + 1.5·IQR OR ≥ 3× family median (high ≥ 5×); family n ≥ 8 |
| 14 buyer_overpays_vs_peers | buyer mean ≥ 2× peer-buyer median for family; ≥ 5 buyer awards in family |
| 15 threshold_hugging | value ∈ [0.95·band, band) for an LCE band ceiling |
| 16 above_supplier_history_avg | ≥ 3× supplier hist avg AND ≥ 3 prior awards |
| 17 low_discount_winner | ≥ 3 valid bids; winner/2nd ≥ 0.98 or winner not lowest; others spread > 10% |
| 18 contract_splitting **(HIGH)** | same buyer+supplier, same UNSPSC family, ≥ 3 awards within 30d, each < 90k, sum ≥ 90k |
| 19 burst_clustering | buyer 7-day awards ≥ 3× its weekly median (Nov–Dec weighted) |
| 20 short_tender_period | only if endDate present; (end−start) < 3d AND value ≥ 90k |
| 21 fast_award_after_publication | (awardDate − datePublished) < 2d AND value ≥ 90k |
| 22 weak_documentation | `documentsSummary.count ≤ 1` AND value ≥ 900k |
| 23 cancelled_then_reaward | cancelled award + later active award (same ocid) to same/related supplier |

## The 23-rule catalog

Presence % cited from `../assets/guatecompras_schema_report.md`. "Hist" =
needs cross-month history (the full scope). `primaryEntityId = buyer.id` for
all.

### F1 — Competition & method abuse

| # | id | OCDS fields (presence) | Evidence | Sev | Hist |
|---|---|---|---|---|---|
| 1 | `single_bidder` | `tender.numberOfTenderers` (100%), `awards[].value.amount` (100% of awards) | tenderer count, award value | med→high by value | no |
| 2 | `low_competition_vs_category` | `tender.numberOfTenderers` (100%), UNSPSC family (from items 100%) | count vs family p25 | med | yes |
| 3 | `direct_award_overreliance` | `procurementMethodDetails` (100%; 94.5% direct), `buyer.id` (100%), `awards[].value.amount` | buyer direct-share vs national, value | med→high | yes |
| 4 | `highvalue_noncompetitive_method` | `procurementMethodDetails` (100%), `awards[].value.amount`, family median | method, value, vs median | high | yes |
| 5 | `disqualification_clears_field` | `bids[].status` (valid/disqualified; bids 65.5%), `awards[].supplierIds` | bid count, disqualified count, winner | high | no |
| 6 | `failed_then_single_award` | `tender.statusDetails` (Desierto 582 / Prescindido 506), `awards[].supplierIds` | prior failed status, re-award | low (see caveat) | yes |

### F2 — Supplier concentration & networks

| # | id | OCDS fields (presence) | Evidence | Sev | Hist |
|---|---|---|---|---|---|
| 7 | `supplier_concentration_per_buyer` | `awards[].supplierIds` (100% of awards), `awards[].value.amount`, `buyer.id` | supplier %, total value, contract count | **high (hero)** | yes |
| 8 | `buyer_dependence_on_supplier` | `awards[].supplierIds`, `buyer.id` | share by count + value | med→high | yes |
| 9 | `supplier_cross_categories` | `awards[].supplierIds`, UNSPSC family (100% items) | distinct family list | med | yes |
| 10 | `repeat_winner_same_competitors` | `bids[].tendererId` (bids 65.5%), `awards[].supplierIds` | recurring bidder set, win rate | high | yes |
| 11 | `new_supplier_large_first_award` | supplier rollup (first award date), `awards[].value.amount` | first-seen date, award value | med | yes |
| 12 | `individual_large_contract` | `entities.entityType` (hint), `awards[].value.amount` | entity type, value vs cohort | med | yes |

### F3 — Pricing anomalies

| # | id | OCDS fields (presence) | Evidence | Sev | Hist |
|---|---|---|---|---|---|
| 13 | `price_outlier_vs_category` | `awards[].value.amount`, UNSPSC family (100% items) | value, family median, multiple | high | yes |
| 14 | `buyer_overpays_vs_peers` | `awards[].value.amount`, `buyer.id`, UNSPSC family | buyer avg vs peer median | med | yes |
| 15 | `threshold_hugging` | `awards[].value.amount` (100% of awards) | value, nearest LCE band | med | no |
| 16 | `above_supplier_history_avg` | supplier rollup avg, `awards[].value.amount` | value vs supplier avg | med | yes |
| 17 | `low_discount_winner` | `bids[].amount` (bids 65.5%), `awards[].value.amount` | winner vs others spread | med | no |

### F4 — Timing, splitting & integrity

| # | id | OCDS fields (presence) | Evidence | Sev | Hist |
|---|---|---|---|---|---|
| 18 | `contract_splitting` | `awards[].supplierIds`, `buyer.id`, UNSPSC family, `awards[].value.amount`, `awards[].date` (100% of awards) | clustered awards, sum, per-award value | **high** | yes |
| 19 | `burst_clustering` | `awards[].date`, `buyer.id` | award timeline histogram | med | yes |
| 20 | `short_tender_period` | `tender.tenderPeriod.startDate` (100%), `endDate` (**only 24.9%** — fires only when present) | period length, value | med | no |
| 21 | `fast_award_after_publication` | `tender.datePublished` (100%), `awards[].date` (100% of awards) | elapsed days, value | med | no |
| 22 | `weak_documentation` | `tender.documentsSummary` (from documents 100%), `contracts[].documentsCount` | doc count, value | low→med | no |
| 23 | `cancelled_then_reaward` | `awards[].status` (cancelled 21/3350), `awards[].supplierIds` | cancelled award, re-award link | med | yes |

## Notes & caveats

- **Dropped:** amendment / cost-increase detection — no amendments data and
  only 54 contracts/month (`contracts` present in 0.31% of records).
- **Rule 6 caveat:** with latest-compiledRelease-only storage (file 02) there
  is no per-month status history. Implement best-effort: same buyer + same
  UNSPSC family, a Desierto/Prescindido tender within N days before an awarded
  single-supplier tender. `needsHistory: true`, capped at low
  severity/confidence.
- Rules marked **Hist** require the full ingested scope. Single-month-capable
  rules (1, 5, 15, 17, 20, 21, 22) cover the 48h thin slice (`08`).
- Rule 20 only evaluates when `tenderPeriod.endDate` exists (~25%); absence is
  not a signal.
- Hero demo signal = **rule 7 `supplier_concentration_per_buyer`**,
  reinforced by 1/3 and 13.
- All thresholds live in the **Default RuleConfig** above — tune there, never
  hardcode in rule bodies.
