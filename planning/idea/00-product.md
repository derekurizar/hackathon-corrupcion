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

## Lead persona & voice

The **primary persona is the investigative journalist**. The story voice is a
**newsroom lead/nut-graf** style: evidence-forward, precise, sober. Citizens
are served through the plain-language summary and the 60-second podcast;
auditors/civil society through the evidence panel and methodology page. All UI
copy follows the same journalist-investigative tone.

## Ethical & legal guardrails (enforced in code + prompts)

- Every claim in an article must be backed by an evidence item with the exact
  OCDS field(s) used and the benchmark compared against.
- Every story (text + podcast, ES + EN) must include the mandatory caveat that
  signals are indicators, not proof.
- Risk is shown as **Review Priority (High/Med/Low) + the list of fired
  signals** — never a single "corruption score".
- **Individual-supplier anonymization.** Buyers and company suppliers are
  named. **Natural-person suppliers** (entity type *individual*) are
  **anonymized** in all public output — rendered as "an individual supplier"
  (ES: "un proveedor individual") in headline/body/podcast/graph labels. The
  personal name and canonical id stay **internal only** (never in the
  published investigation, the article API payload, or any UI label).
  Anonymization is performed at the **LLM/story layer** (prompt +
  deterministic post-check); raw names are stored verbatim only in the
  internal collections (`curatedReleases`/`entities`/`signals`) — see `04`/`06`.
- **Guardrail-fail behavior.** If the post-generation check trips
  (banned phrase, an unbacked claim, or a personal name leaking for an
  individual), retry generation once with a stricter instruction; if it still
  fails, publish the **deterministic evidence-only summary** built directly
  from the signals. This never blocks the pipeline or the demo.
- **Evidence-bound visuals.** The article's visuals come from a fixed Scene
  Catalog. The LLM may *select* a scene (from a rule-filtered shortlist) and
  fill its params, but every quantitative param is validated against the
  deterministic evidence and rejected otherwise — so a richer-looking visual
  can never assert a number the data didn't produce. See `05`/`04`.
- Entities are public institutions and awarded suppliers already published in
  Guatecompras; no private data is introduced.

## Visual identity (a core differentiator)

The UI is **investigative-noir**: a cinematic, documentary "exposé" feel —
near-black canvas, a single hot blood-red accent, huge condensed uppercase
display type, film-grain/duotone imagery, deliberate motion. The flagship
**Investigation Article** is a chaptered, scrollytelling/presentation/podcast
experience (reference: `../assets/ui_idea.png`). The drama serves
*comprehension and gravity*, never accusation — the positioning/guardrails
above still govern all copy. Full design system, chapter spine, the
data-driven scene system, and motion choreography live in `05-frontend.md`;
this WOW factor is a primary judging lever (`08`).

## Brand (configurable)

Single source of truth: `BRAND = { name, tagline }` + i18n keys. Candidate
working titles (the mock uses "Verdad sin Filtro"):

- ES: **Expediente Público** · alt **Verdad sin Filtro**
- EN: **Open Contract Newsroom**

Never hardcode the name in components, prompts, or audio scripts. The name is
expected to change; swapping `BRAND` + i18n must be sufficient.

## Target users

- **Journalists (primary)** — find leads fast, with traceable evidence and a
  defensible newsroom narrative.
- **Citizens** — understand where public money goes via the plain summary +
  podcast.
- **Auditors / civil society** — prioritize which contracts to review using
  the evidence panel and methodology page.

## Demo hero

A single polished **supplier-concentration** investigation: one company
capturing a large share of an institution's awarded value, reinforced by
low-competition and direct-award signals — shown as the full-anatomy
Investigation Article with a 60-second bilingual podcast. See
`08-scope-and-demo.md`.

## Trust surface

In addition to the per-article methodology/caveat footer, a dedicated
**Methodology / About page** (`/methodology`) explains the data source,
period covered, how detection works, limitations, and the "signals not proof"
stance. Linked from the header and every article footer. (See `05`.)

## Non-goals (MVP)

- No legal conclusions, scoring of "guilt", or naming wrongdoing.
- No fuzzy supplier-name matching (canonical id only — see `02`).
- No geographic/map visualization (stretch — see `08`).
- No amendment/cost-increase detection (no data — see `03`).
