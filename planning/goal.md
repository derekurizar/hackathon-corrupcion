# Goal

Turn ~1 year of Guatemala's public procurement data (Guatecompras / OCDS) into
**explainable investigative journalism**: detect unusual patterns with
deterministic rules, narrate them with Claude, and present interactive
bilingual articles with motion design and 60-second podcast narration.

Full product spec lives in [`idea/`](./idea/) (start at
[`idea/README.md`](./idea/README.md)).

## Success criteria (hackathon)

**MVP floor (guaranteed deliverable):** a polished bilingual
**supplier-concentration** investigation end-to-end (Dashboard → Newsroom →
Article → 60s ES/EN podcast) + Dashboard radar, deployed on the CloudFront
URL, all content pre-generated.

Beyond the floor:
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
