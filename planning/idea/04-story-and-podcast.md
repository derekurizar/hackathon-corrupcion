# 04 — Story Generation, Podcast & Dedup

## Case clustering (RankAndCluster stage)

Detection emits many `ContractSignal`s. They are grouped into **cases** before
narration:

```txt
caseKey = sha256( primaryEntityId | signalFamily | timeWindow )
```

- One **investigation = one case** = all signals sharing `caseKey`
  (e.g. `GT-NIT:4132726 | F2 | 2026`).
- A case naturally spans many contracts (concentration/splitting are
  multi-contract by nature).
- Rank cases for top-N selection by: review priority → aggregate confidence →
  total value → recency. Select up to `MAX_INVESTIGATIONS_PER_RUN`
  (SSM, default ~20 — a **cost guard**, changeable/removable, not a product
  cap).

## Claude story generation (evidence-constrained)

One Lambda per selected case (`Map: GenerateStory`). Model: Claude
(Anthropic), `claude-sonnet` for cost/speed.

**Prompt structure (with prompt caching):**

- *Cached system block* (stable across all cases): role, the
  positioning/guardrails from `00-product.md`, the **banned-phrase list**, the
  required output JSON schema, the mandatory caveat text. Caching this large
  stable prefix cuts cost/latency across the ~20 cases per run.
- *Per-case user block*: the structured case summary — fired signals, evidence
  items (field + value + benchmark + comparison), entities (names + canonical
  ids), values, time window. **The model may only use facts present here.**

**Output (structured JSON, both languages):**

```jsonc
{
  "es": { "headline": "...", "summary": "...", "sections": [...],
          "key_findings": ["..."], "caveat": "..." },
  "en": { "headline": "...", "summary": "...", "sections": [...],
          "key_findings": ["..."], "caveat": "..." },
  "podcast_script": { "es": "~150 words ≈ 60s", "en": "~150 words ≈ 60s" }
}
```

**Guardrail enforcement:** post-generation check asserts no banned phrase and
that every `key_finding` maps to a provided evidence item. On violation:
one retry with a stricter instruction, else fall back to a deterministic
template summary built directly from evidence (never block publishing).

## Podcast (ElevenLabs)

- `Map: GenerateAudio` turns `podcast_script.es` / `.en` into two ~60-second
  mp3s via ElevenLabs (neutral, investigative narrator voice).
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

Each `Publish` run creates/links an **Edition** — a periodic issue
referencing the investigations published/updated that run:

```jsonc
{ "editionId": "2026-05", "publishedAt": "...",
  "investigationCaseKeys": ["...", "..."],
  "leadCaseKey": "...",            // hero of the issue
  "stats": { count, totalValueFlagged, byFamily } }
```

- The **Newsroom feed = latest Edition** (with access to past editions).
- An investigation may aggregate multiple related cases when they share the
  same `primaryEntityId` across families (optional digest grouping; MVP keeps
  one case per article, Edition provides the "newspaper" cohesion).

## Cost & runtime guards

- `MAX_INVESTIGATIONS_PER_RUN` (SSM) bounds Claude + ElevenLabs calls per run.
- Prompt caching on the stable system prefix.
- `evidenceHash` skip avoids regenerating unchanged investigations on every
  monthly run.
