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
  confidence: number;               // 0..1, deterministic from how far past threshold
  explanation: string;              // i18n key + interpolated values
  evidence: {
    field: string;                  // exact OCDS path used
    value: unknown;
    comparison?: string;            // e.g. "4.6x category median"
    benchmark?: unknown;
  }[];
  story_angle: string;              // seed for the LLM
  primaryEntityId: string;          // for caseKey (see 04)
  timeWindow: string;               // e.g. "2026" or "2026-Q2"
};
```

Rules are registered in an array; adding a rule = add one module. All
thresholds live in `RuleConfig` (no magic numbers in rule bodies) so the
catalog can be tuned without touching the engine.

## Benchmark stage (runs before detection)

Computed once over **all curated months in the DB**, written to `benchmarks`:

- **Category price stats** per `tender.items[].classification.id` (UNSPSC):
  median, IQR (p25/p75), count, by `mainProcurementCategory`.
- **Buyer method mix**: per `buyer.id`, share of awarded value & count by
  `procurementMethodDetails`; national baseline (≈94.5% `Compra Directa`).
- **Peer baselines**: median price per category across buyers (for "buyer
  overpays vs peers").
- **Supplier rollups**: per canonical supplier id — awards count/value, set of
  buyers, set of UNSPSC categories, first/last award date, history avg.
- **Buyer rollups**: per `buyer.id` — total awarded value, supplier shares.
- **Period scope**: min/max month covered (windows = full scope, or per year).

## Risk presentation: Review Priority, no score

Users see a **Review Priority** badge + the list of fired signals. No
composite numeric score is shown (avoids "is this corruption?" misreading).

```txt
review_priority =
  "high"   if any high-severity signal OR ≥3 medium signals
  "medium" if any medium-severity signal OR ≥2 low signals
  "low"    otherwise
```

(Internal confidence values may inform ranking for top-N selection — see
`04` — but are never surfaced as a public "corruption score".)

## The 23-rule catalog

Presence % cited from `../assets/guatecompras_schema_report.md`. "Hist" =
needs cross-month history.

### F1 — Competition & method abuse

| # | id | Trigger (tunable) | OCDS fields (presence) | Evidence | Sev | Hist |
|---|---|---|---|---|---|---|
| 1 | `single_bidder` | `numberOfTenderers ≤ 1` AND award value ≥ floor | `tender.numberOfTenderers` (100%), `awards[].value.amount` (100% of awards) | tenderer count, award value | med→high by value | no |
| 2 | `low_competition_vs_category` | `numberOfTenderers` below category p25 of tenderer counts | `tender.numberOfTenderers` (100%), `tender.items[].classification.id` (100%) | count vs category benchmark | med | yes |
| 3 | `direct_award_overreliance` | Buyer's share of value via `Compra Directa` ≫ national baseline (94.5%) AND volume material | `tender.procurementMethodDetails` (100%; 94.5% direct), `buyer.id` (100%), `awards[].value.amount` | buyer share vs national, value | med→high | yes |
| 4 | `highvalue_noncompetitive_method` | Award value in top decile AND method ∈ {direct/exception arts 43/44/54} | `procurementMethodDetails` (100%), `awards[].value.amount`, category median | method, value, vs median | high | yes |
| 5 | `disqualification_clears_field` | `bids.details` has ≥2, all but ~1 `disqualified`, survivor wins | `bids.details[].status` (valid/disqualified, 100% of bids; bids 65.5%), `awards[].suppliers[].id` | bid count, disqualified count, winner | high | no |
| 6 | `failed_then_single_award` | Tender `Desierto`/`Prescindido` history then re-run awarded to one supplier | `tender.statusDetails` (Desierto 582 / Prescindido 506), `awards[].suppliers[].id` | prior failed status, re-award | med | yes |

### F2 — Supplier concentration & networks

| # | id | Trigger (tunable) | OCDS fields (presence) | Evidence | Sev | Hist |
|---|---|---|---|---|---|---|
| 7 | `supplier_concentration_per_buyer` | One supplier ≥ X% of a buyer's awarded value in window | `awards[].suppliers[].id` (100% of awards), `awards[].value.amount`, `buyer.id` | supplier %, total value, contract count | **high** (hero) | yes |
| 8 | `buyer_dependence_on_supplier` | Buyer routes ≥ X% of its contracts (count) to one supplier | `awards[].suppliers[].id`, `buyer.id` | share by count + value | med→high | yes |
| 9 | `supplier_cross_categories` | Supplier wins ≥ N unrelated UNSPSC top-level classes | `awards[].suppliers[].id`, `tender.items[].classification.id` (100%) | distinct category list | med | yes |
| 10 | `repeat_winner_same_competitors` | Same tenderer set recurs ≥ N times, same supplier wins ≥ Y% | `tender.tenderers[].id` (tenderers 65.5%), `awards[].suppliers[].id` | recurring bidder set, win rate | high | yes |
| 11 | `new_supplier_large_first_award` | Supplier's first-ever award (no prior in scope) ≥ value floor | supplier rollup (first award date), `awards[].value.amount` | first-seen date, award value | med | yes |
| 12 | `individual_large_contract` | `legalEntityTypeDetail = INDIVIDUAL` wins value above individual-cohort p90 | `parties[].details.legalEntityTypeDetail` (41.7%), `awards[].value.amount` | entity type, value vs cohort | med | yes |

### F3 — Pricing anomalies

| # | id | Trigger (tunable) | OCDS fields (presence) | Evidence | Sev | Hist |
|---|---|---|---|---|---|---|
| 13 | `price_outlier_vs_category` | Award value > median + k·IQR (or ≥ N× median) for its UNSPSC | `awards[].value.amount`, `tender.items[].classification.id` (100%) | value, category median, multiple | high | yes |
| 14 | `buyer_overpays_vs_peers` | Buyer's avg unit/contract value for category ≫ peer-buyer median | `awards[].value.amount`, `buyer.id`, `classification.id` | buyer avg vs peer median | med | yes |
| 15 | `threshold_hugging` | Value clusters just below a known competitive threshold band | `awards[].value.amount` (100% of awards) | value, nearest threshold | med | no |
| 16 | `above_supplier_history_avg` | Award ≥ N× supplier's own historical average | supplier rollup avg, `awards[].value.amount` | value vs supplier avg | med | yes |
| 17 | `low_discount_winner` | Winning `bids.details` amount ≈ award value while other valid bids diverge widely | `bids.details[].value.amount` (100% of bids; 65.5%), `awards[].value.amount` | winner vs others spread | med | no |

### F4 — Timing, splitting & integrity

| # | id | Trigger (tunable) | OCDS fields (presence) | Evidence | Sev | Hist |
|---|---|---|---|---|---|---|
| 18 | `contract_splitting` | Same `buyer.id`+supplier id, similar UNSPSC, ≥N awards within W days, each below threshold, large sum | `awards[].suppliers[].id`, `buyer.id`, `classification.id`, `awards[].value.amount`, `awards[].date` (100% of awards) | clustered awards, sum, per-award value | **high** | yes |
| 19 | `burst_clustering` | Buyer issues abnormal award volume in short window (e.g. fiscal year-end) | `awards[].date`, `buyer.id` | award timeline histogram | med | yes |
| 20 | `short_tender_period` | `tenderPeriod.endDate − startDate` below floor for value tier | `tender.tenderPeriod.startDate` (100%), `endDate` (**only 24.9%** — rule only fires when present) | period length, value | med | no |
| 21 | `fast_award_after_publication` | `awards[].date − tender.datePublished` unusually short for value | `tender.datePublished` (100%), `awards[].date` (100% of awards) | elapsed days, value | med | no |
| 22 | `weak_documentation` | High-value process with few/no docs (`documentsSummary.count` low) | `tender.documents[]` (100%, summarized), `contracts[].documents` count | doc count, value | low→med | no |
| 23 | `cancelled_then_reaward` | `awards[].status = cancelled` then re-award to same/related supplier id | `awards[].status` (cancelled 21/3350), `awards[].suppliers[].id` | cancelled award, re-award link | med | yes |

## Notes & caveats

- **Dropped:** amendment / cost-increase detection — no amendments data and
  only 54 contracts/month (`contracts` present in 0.31% of records).
- Rules marked **Hist** require multiple ingested months (concentration,
  splitting, benchmarks). Single-month-only rules (1, 5, 15, 17, 20, 21, 22)
  still work on a thin slice — useful for the 48h vertical slice (`08`).
- Rule 20 only evaluates when `tenderPeriod.endDate` exists (~25%); absence is
  not a signal.
- Hero demo signal = **rule 7 `supplier_concentration_per_buyer`**,
  reinforced by 1/3 and 13.
- All thresholds (`X%`, `k`, `N×`, `W days`, value floors) live in
  `RuleConfig` and are documented there, not hardcoded.
