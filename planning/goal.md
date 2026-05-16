# Goal

Turn ~1 year of Guatemala's public procurement data (Guatecompras / OCDS) into
**explainable investigative journalism**: detect unusual patterns with
deterministic rules, narrate them with Claude, and present interactive
bilingual articles with motion design and 60-second podcast narration.

Full product spec lives in [`idea/`](./idea/) (start at
[`idea/README.md`](./idea/README.md)).

## Success criteria

Build a **good product**, phased & dependency-ordered — not a demo. The
executable plan is `tasks/00-sequence.md` (Phases 0–4); per-area task files
are `tasks/01..12`. **Demo is not a build driver.**

**First usable product increment (end of Phase 3):** from real ingested data,
the SPA serves the Dashboard (radar), the Newsroom (all current
investigations + current Edition), and the cinematic Article (7 core scenes,
Scroll mode) fully bilingual with the 60s podcast; every claim
evidence-traceable; individuals anonymized; caveat in text + audio; deployed
(S3/CloudFront + API + external Atlas).

Quality bar:
- Deterministic detection (pluggable engine, default RuleConfig with LCE
  bands); LLM only narrates from structured evidence.
- Every claim traceable to exact OCDS fields + a benchmark (Evidence panel)
  via the `/methodology` page.
- Fully bilingual (ES/EN) UI, stories, and audio (separate native voices).
- Deployed AWS-native (S3/CloudFront + API Gateway/Lambda + Step Functions,
  single CDK app). **MongoDB Atlas is external/pre-existing — not provisioned
  by CDK.**

Judging rewards **civic impact + storytelling + design/UX wow**; technical
breadth (all 23 rules) is secondary/stretch.

## Ethical guardrail (non-negotiable)

The system **does not prove corruption**. It surfaces *review signals* —
contracts/patterns worth reviewing. Enforcement: evidence-constrained prompt,
banned-phrase + evidence-mapping checks, **natural-person suppliers anonymized
at the LLM layer**, mandatory caveat in every story and podcast; on failure,
retry once then fall back to a deterministic evidence summary. See
[`idea/00-product.md`](./idea/00-product.md).
