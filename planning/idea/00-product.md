# 00 — Product

## Vision

Most citizens, journalists, and even officials cannot read raw OCDS
procurement data. This product transforms ~1 year of Guatemala's Guatecompras
data into **explainable investigative journalism**: it detects unusual
patterns with deterministic rules, then uses Claude to narrate each finding as
an interactive, bilingual, evidence-backed story with motion design and a
60-second podcast.

The differentiator is **explainability**: every generated sentence traces back
to specific OCDS fields and a benchmark. It is *a transparent investigation
assistant, not a generic AI text generator*.

## Positioning

**Say:** "review signals", "unusual pattern vs comparable contracts",
"contracts worth reviewing", "indicators that deserve investigation".

**Never say:** "this is corruption", "this company committed fraud", "this
contract is illegal", "the system detected wrongdoing".

> Framing: *The system does not prove corruption. It identifies contracts and
> patterns that deserve further review by journalists, auditors, civil
> society, or institutions.*

## Ethical & legal guardrails (enforced in code + prompts)

- Every claim in an article must be backed by an evidence item with the exact
  OCDS field(s) used and the benchmark compared against.
- Every story (text + podcast, ES + EN) must include the mandatory caveat that
  signals are indicators, not proof.
- Risk is shown as **Review Priority (High/Med/Low) + the list of fired
  signals** — never a single "corruption score".
- Banned-phrase list is part of the story-generation prompt and is asserted in
  a post-generation check; regenerate or fall back to the deterministic
  summary on violation.
- Entities are public institutions and awarded suppliers already published in
  Guatecompras; no private data is introduced.

## Brand (configurable)

Single source of truth: `BRAND = { name, tagline }` + i18n keys. Working
title:

- ES: **Expediente Público**
- EN: **Open Contract Newsroom**

Never hardcode the name in components, prompts, or audio scripts. The name is
expected to change; swapping `BRAND` + i18n must be sufficient.

## Target users

- **Journalists** — find leads fast, with traceable evidence to investigate.
- **Citizens** — understand where public money goes, in plain language + audio.
- **Auditors / civil society** — prioritize which contracts to review.

## Demo hero

A single polished **supplier-concentration** investigation: one company
capturing a large share of an institution's awarded value, reinforced by
low-competition and direct-award signals — shown as the full-anatomy
Investigation Article with a 60-second bilingual podcast. See
`08-scope-and-demo.md`.

## Non-goals (MVP)

- No legal conclusions, scoring of "guilt", or naming wrongdoing.
- No fuzzy supplier-name matching (canonical id only — see `02`).
- No geographic/map visualization (stretch — see `08`).
- No amendment/cost-increase detection (no data — see `03`).
