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

**Output (fixed structured JSON, both languages):**

```jsonc
{
  "es": { "headline": "...", "summary": "...",
          "sections": {
            "queEncontramos": "...",      // What we found
            "porQueSeMarco": "...",       // Why it was flagged
            "laEvidencia": "...",         // The evidence
            "queSignificaYQueNo": "..."   // What this does and doesn't mean
          },
          "keyFindings": ["..."], "caveat": "..." },
  "en": { "headline": "...", "summary": "...",
          "sections": { "whatWeFound": "...", "whyFlagged": "...",
                        "theEvidence": "...", "whatItMeans": "..." },
          "keyFindings": ["..."], "caveat": "..." },
  "podcast_script": { "es": "~150 words ≈ 60s, ends with the caveat",
                       "en": "~150 words ≈ 60s, ends with the caveat" }
}
```

The fixed 4-section template lets `05` render predictably.

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

- `Map: GenerateAudio` turns `podcast_script.es` / `.en` into two ~60-second
  mp3s via **ElevenLabs** (`eleven_multilingual_v2`), using **separate native
  voices**: `ELEVENLABS_VOICE_ES` and `ELEVENLABS_VOICE_EN` (SSM config).
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
