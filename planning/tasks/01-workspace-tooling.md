# 01 — Workspace & Tooling

Spec refs: `../idea/01-architecture.md` (workspace layout, dev loop),
`../idea/README.md`. Phase 0.

## Epic 1.1 — Monorepo skeleton
- [ ] Init pnpm workspace; packages `core`, `handlers`, `scene-contract`,
  app `frontend/`, `infrastructure/`, `scripts/`.
  *Done:* `pnpm -r build` runs clean on empty stubs.
- [ ] Root `tsconfig` (strict) + per-package extends; path aliases (`@core`,
  `@scene-contract`).
  *Done:* a cross-package import type-checks.
- [ ] Vitest at root; `pnpm test` discovers package tests.
  *Done:* one trivial test passes in `core`.
- [ ] ESLint + Prettier + editorconfig; `pnpm lint` clean.
  *Done:* lint passes on the skeleton.

## Epic 1.2 — Shared OCDS types
- [ ] Vendor `../assets/guatecompras_observed_types.ts` into `@core/ocds`
  **verbatim**; re-export.
  *Done:* `@core` exposes the OCDS input types unchanged.
- [ ] Add `zod` + define the curated `CuratedRelease` schema/type (per
  `../idea/06`).
  *Done:* `CuratedRelease` Zod schema + inferred type compile; unit test
  parses a hand-built fixture.

## Epic 1.3 — Config & secrets (local)
- [ ] `.env.example` + loader: `MONGODB_URI`, `ANTHROPIC_API_KEY`,
  `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ES/EN`,
  `MAX_INVESTIGATIONS_PER_RUN`, stage toggles, `BRAND_*`.
  *Done:* typed config object; missing-required throws with a clear message.
- [ ] `.gitignore` covers `.env`, build, `cdk.out`.
  *Done:* `git status` clean after a build.

## Epic 1.4 — `@core` CLI runner (dev loop)
- [ ] `scripts/` CLI: subcommands `ingest`, `benchmarks`, `detect`,
  `generate`, `publish` calling `@core` against the real Atlas.
  *Done:* `pnpm cli --help` lists subcommands; each is a thin wrapper (no
  AWS).
- [ ] Memoized Mongo client in `@core` reused across CLI invocations.
  *Done:* CLI connects once; integration smoke test green.
