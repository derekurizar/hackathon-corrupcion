# Goal

Turn ~1 year of Guatemala's public procurement data (Guatecompras / OCDS) into
**explainable investigative journalism**: detect unusual patterns with
deterministic rules, narrate them with Claude, and present interactive
bilingual articles with motion design and 60-second podcast narration.

Full product spec lives in [`idea/`](./idea/) (start at
[`idea/README.md`](./idea/README.md)).

## Success criteria (hackathon)

- End-to-end demo: Dashboard → Newsroom → a polished
  **supplier-concentration** Investigation Article → 60s ES/EN podcast.
- Deterministic detection (23-rule pluggable engine); LLM only narrates from
  structured evidence.
- Every claim traceable to exact OCDS fields + a benchmark (Evidence panel).
- Fully bilingual (ES/EN) UI, stories, and audio.
- Deployed AWS-native (S3/CloudFront + API Gateway/Lambda + Step Functions +
  MongoDB Atlas, single CDK app); all demo content pre-generated.

## Ethical guardrail (non-negotiable)

The system **does not prove corruption**. It surfaces *review signals* —
contracts/patterns worth reviewing. Banned-phrase enforcement + mandatory
caveat in every story and podcast. See [`idea/00-product.md`](./idea/00-product.md).
