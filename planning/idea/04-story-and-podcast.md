# 04 — Story Generation, Podcast & Dedup

## Case clustering (RankAndCluster stage)

Detection emits many `ContractSignal`s. They are grouped into **cases** before
narration:

```txt
caseKey = sha256( buyer.id | signalFamily | scope )
```

- `primaryEntityId` is always `buyer.id` (see `03`), so a case is one
  **(buyer, signal family, full scope)** — e.g. `GT-NIT:4132726 | F2 |
  2025-08..2026-07` → "Ministry X — supplier concentration — 2025/26".
- One **investigation = one case** = all signals sharing `caseKey`. A case
  naturally spans many contracts (concentration/splitting are multi-contract).
  The buyer is the accountable institution; supplier(s) are secondary.
- Rank cases for top-N selection by: review priority → aggregate confidence →
  total value → recency. Select up to `MAX_INVESTIGATIONS_PER_RUN`
  (SSM, default ~20 — a **cost guard**, changeable/removable, not a product
  cap).

## Claude story generation (evidence-constrained)

One Lambda per selected case (`Map: GenerateStory`). Model: **Claude Sonnet
4.6** (`claude-sonnet-4-6`). Follow the `claude-api` skill patterns; use
**prompt caching** on the stable system prefix. (Optional stretch: Opus 4.7
for the single hero/lead investigation only.)

**Prompt structure (with prompt caching):**

- *Cached system block* (stable across all cases): role + the
  **journalist-investigative voice** (newsroom lead/nut-graf), the
  positioning/guardrails from `00-product.md`, the **banned-phrase list**, the
  **individual-anonymization rule** (institutions/companies named;
  natural-person suppliers → "an individual supplier" / "un proveedor
  individual"), the required output JSON schema, the mandatory caveat text.
- *Per-case user block*: the structured case summary — fired signals, evidence
  items (field + value + benchmark + comparison), entities (buyer named;
  each supplier with an `entityType` hint = company|individual|unknown),
  values, scope. **The model may only use facts present here.**

**Output — chapter-aligned structured JSON, both languages.** The prose is
keyed to the cinematic **chapter spine** in `05` (Cover · 01 El Caso · 02
Sigue el Dinero · 03 Las Conexiones · 04 Evidencia · 05 Cronología · Cierre)
so the article renders predictably while scenes vary by data:

```jsonc
{
  "es": {
    "cover":          { "kicker": "...", "headline": "...", "dek": "..." },
    "elCaso":         "...",   // What we found (newsroom lead)
    "sigueElDinero":  "...",   // The value story
    "lasConexiones":  "...",   // The buyer→supplier relationship
    "cronologia":     "...",   // Timeline narration
    "cierre":         { "queSignificaYQueNo": "...", "caveat": "..." },
    "keyFindings":    ["..."]
  },
  "en": {
    "cover":          { "kicker": "...", "headline": "...", "dek": "..." },
    "theCase": "...", "followTheMoney": "...", "theConnections": "...",
    "timeline": "...",
    "closing": { "whatItMeans": "...", "caveat": "..." },
    "keyFindings": ["..."]
  },
  "podcast": {
    "es": { "script": "~150 words ≈ 60s, ends with the caveat",
            "cuePoints": [ { "chapter": "cover", "tSec": 0 },
                           { "chapter": "elCaso", "tSec": 8 }, ... ] },
    "en": { "script": "...", "cuePoints": [ ... ] }
  }
}
```

- **Evidencia** chapter has no LLM prose — it renders the structured,
  traceable evidence items directly (trust core).
- `podcast.cuePoints` are **approximate** per-chapter start offsets derived
  from the script segmentation, used by `05`'s podcast mode for chapter
  auto-advance. **Tight/word-level sync is an explicit non-goal.**

## Scene plan (LLM picks from a rule-filtered shortlist)

The article renders from a **fixed Scene Catalog** (`05`) — no generative
layout. For each chapter the LLM selects the best scene **and** fills its
params:

1. **Deterministic shortlist.** Detection output (fired rule families) yields
   a fixed allow-list of `sceneId`s per chapter (the shortlist mapping is
   defined in `05`). The LLM can only choose from scenes the data supports.
2. **LLM selection + params.** `GenerateStory` emits, per chapter, a
   `scenePlan` entry `{ sceneId ∈ shortlist, params }` — the LLM picks the
   best-fitting scene and fills its typed param schema.
3. **Evidence-binding validation.** A deterministic validator requires every
   **quantitative** param (amounts, %, counts, dates, entity ids/names) to
   reference a signal/evidence value by id; anything not traceable to the
   evidence is rejected. **Presentational** params (captions, emphasis,
   ordering, which 2–3 entities to feature) are free.
4. **Default fallback.** On validation failure / out-of-shortlist `sceneId` /
   missing data, the chapter's **guaranteed default scene** renders with
   params derived straight from evidence. Result is recorded as
   `source: "fallback"` (vs `"llm"`).

```jsonc
scenePlan[chapter] = { "sceneId": "...", "params": { ... },
                       "source": "llm" | "fallback" }
```

The trust model holds because the **shortlist + evidence-binding validation**
constrain the LLM — not by forbidding it from choosing. The cinematic shell is
constant; scene choice + params make each article distinct; the article always
renders.

> The authoritative per-scene **param schemas**, the deterministic
> **rule-family → scene shortlist**, and the **validator contract** are
> defined in `05-frontend.md` → "Scene contract". Generation emits params
> conforming to it (quantitative params carry a `ref` to a signal/evidence
> id; bound params are server-supplied; presentational params are free).

**Guardrail enforcement (from `00`):** post-generation check asserts (a) no
banned phrase, (b) every `keyFinding` maps to a provided evidence item, and
(c) **no personal name appears when an involved supplier's `entityType =
individual` (or `unknown`)**. On violation: **retry once** with a stricter
instruction; if it still fails, publish the **deterministic evidence-only
summary** built from the signals. Never blocks the pipeline/demo.

## Anonymization boundary

Anonymization happens **here, at the LLM/story layer** — not at ingestion.
Raw names stay verbatim in `curatedReleases`/`entities`/`signals` (internal).
The published `investigations` doc (the public article + API payload) contains
**only the anonymized text**. The structured `investigations.supplier`
display fields are computed at publish (`06`) using the same individual rule;
the UI never masks anything client-side.

## Podcast (ElevenLabs)

- `Map: GenerateAudio` turns `podcast.es.script` / `podcast.en.script` into
  two ~60-second mp3s via **ElevenLabs** (`eleven_multilingual_v2`), using
  **separate native voices**: `ELEVENLABS_VOICE_ES` / `ELEVENLABS_VOICE_EN`
  (SSM). `podcast.{lang}.cuePoints` are persisted for `05`'s podcast mode
  (approximate chapter auto-advance; not word-synced).
- Stored in S3 `audio` bucket, keys
  `audio/{caseKey}/{version}/{es|en}.mp3`, served via CloudFront `/audio/*`.
- Pre-generated in the pipeline (no live TTS during the demo). Skipped if the
  audio for `{caseKey, version}` already exists.

## Article identity & dedup (no repeats, stays current)

`investigations` is keyed by `caseKey` (one canonical doc per case):

```txt
evidenceHash = sha256( normalized(sorted signals + evidence values) )
```

`Publish` upsert logic per case:

- **No existing doc** → insert (version 1), generate story + audio.
- **Exists, same `evidenceHash`** → skip generation entirely (idempotent;
  safe to re-run the monthly pipeline over overlapping data).
- **Exists, changed `evidenceHash`** → regenerate story + audio,
  `version += 1`, **overwrite the canonical doc** (supersede; previous
  audio keys are versioned so old links don't break mid-demo).

Result: the monthly EventBridge run never produces duplicate articles; an
investigation only updates when its underlying evidence materially changes.

## Editions ("newspaper")

The **Newsroom feed = all current published investigations** (sorted/filtered
— see `05`/`07`). An **Edition is a featured "issue" per publish-run**:

```jsonc
{ "_id": "<run-seq-or-timestamp>", "publishedAt": "...",
  "leadCaseKey": "...",                 // hero of the issue
  "highlightCaseKeys": ["...", "..."],
  "stats": { count, totalValueFlagged, byFamily } }
```

- `editionId` = publish-run sequence/timestamp (**not** a calendar month).
- The current Edition surfaces on the Newsroom as a **featured
  banner/section** (lead + highlights). Past-edition browsing is a **stretch**.
- An investigation may aggregate multiple related cases of the same buyer
  across families (optional digest grouping; MVP keeps one case per article,
  the Edition provides the "newspaper" cohesion).

## Cost & runtime guards

- `MAX_INVESTIGATIONS_PER_RUN` (SSM) bounds Claude + ElevenLabs calls per run.
- `Map` concurrency for story/audio = 3 with 429 backoff (see `07`).
- Prompt caching on the stable system prefix.
- `evidenceHash` skip avoids regenerating unchanged investigations on every
  monthly run.
