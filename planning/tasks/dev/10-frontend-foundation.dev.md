# 10 — Frontend Foundation (dev plan)

Spec: [`../10-frontend-foundation.md`](../10-frontend-foundation.md) | Idea
refs: `../../idea/05-frontend.md` (design system / routes / i18n / shell),
`../../idea/00-product.md` (brand)
Phase: 3 | Depends on: 09 | Blocks: 11 (Article), 12 (Dashboard/Newsroom/
Methodology)
Prereqs (`00-sequence.dev.md` §2): Phase 2 exit green; Area 02 deployed
(`web` bucket + CloudFront SPA fallback + `deploy:fe`); Area 06
`sync:scene-contract` available; Node 20 + pnpm.

## Structure & boundaries

- First work in **`frontend/`** — a **fully isolated standalone Vite+React+TS
  SPA** (00 §0: no pnpm workspace, **no `file:../backend` dep**). Area 01
  deferred this bootstrap to Area 10; set the folder up against the existing
  shared root config (`tsconfig.base.json`, `eslint.config.mjs`,
  `.prettierrc`, `.editorconfig`, `.nvmrc`).
- **API types are frontend-owned + zod-validated** (user decision): no sync,
  no `file:` dep — `frontend/src/api/` re-declares the 5 response schemas and
  the client **runtime-validates** every response. The **scene-contract** is
  the Area 06 **hand-synced copy** `frontend/src/_scene-contract/`
  (`backend` `sync:scene-contract` + `SCENE_CONTRACT_HASH`).
- **Deploy is Area 02's `deploy:fe`** (in `infrastructure/`); Area 10 only
  produces `frontend/dist/` and verifies through it.
- **Scope:** Area 10 = shell + 4 routes + noir tokens + i18n + data layer +
  route **placeholders**. Area 11 = Article spine/`ScenePicker`/scenes/
  nav-mode mechanics. Area 12 = Dashboard/Newsroom/Methodology views.
  `TransportBar` mode/lang **toggle UI + nav-state scaffold** is Area 10;
  scene-driven scroll/presentation/podcast behaviour is Area 11.
- Area 10 edits **only `frontend/`** (plus running Area 06's
  `sync:scene-contract` once) — no edits to backend/infrastructure/
  data-integestion.

---

## Epic 10.1 — App scaffold  (Phase 3)

Goal: a deployable Vite+React+TS SPA with routing + SPA-fallback.

Steps:
1. Bootstrap `frontend/`: `package.json` (private, `engines.node>=20`, pnpm;
   scripts `dev`/`build`/`preview`/`lint`/`typecheck`/`test`); Vite + React +
   TS; Tailwind + shadcn/ui init; `frontend/tsconfig.json` **extends
   `../tsconfig.base.json`** with Vite/React overrides (`lib:["ES2022","DOM",
   "DOM.Iterable"]`, `jsx:"react-jsx"`, `moduleResolution:"bundler"`,
   `types`); root `eslint.config.mjs`/`.prettierrc`/`.editorconfig`/`.nvmrc`
   by path.
2. React Router routes `/`, `/newsroom`, `/investigation/:caseKey`,
   `/methodology` → **placeholder route components** (real views = Areas
   11/12). `vite build` → `frontend/dist/`.

Verify (spec *Done*):
- "`pnpm deploy:fe` serves the app on the CF URL" →
  `pnpm --dir frontend build` emits `dist/`;
  `pnpm --dir infrastructure run deploy:fe` (Area 02) → the CF URL serves the
  app.
- "refresh on a deep link resolves (CF→index.html)" → reload
  `https://<cf>/investigation/x` returns the SPA (Area 02 403/404→
  `/index.html`).

## Epic 10.2 — Design system (noir tokens)  (Phase 3)

Goal: the idea/05 noir token layer + grain/duotone utilities.

Steps:
1. Tailwind theme + CSS variables, verbatim idea/05: `bg/base #0A0A0B`,
   `bg/panel #121214`, `bg/panel-2 #17171A`, `accent/red #E10600`,
   `accent/red-deep #B0050B`, `text/hi #F5F5F5`, `text/mid #9A9AA0`,
   `text/dim #5A5A5E`, `line #262629`, `priority/high|med|low` = red |
   `#E6A100` | `#6B7280`; type scale (display Anton/Bebas, body Inter,
   tabular-numeric, oversized chapter numerals), spacing/line tokens.
2. `frontend/src/ui/GrainOverlay.tsx` + duotone(red→black)/vignette/red-glow
   utilities via **CSS blend** (no heavy assets). A dev-only `/dev/tokens`
   preview route.

Verify (spec *Done*):
- "token preview matches `../assets/ui_idea.png` language; AA contrast
  checked" → `/dev/tokens` renders the palette/type; a test asserts
  `text/hi` and `accent/red` on `bg/base` meet **WCAG AA**.
- "applied without measurable jank" → grain/duotone use transform/opacity
  only (lint/review check).

## Epic 10.3 — Shell & i18n  (Phase 3)

Goal: `AppShell`/`BrandRail`/`TransportBar` + bilingual i18n, brand from
config.

Steps:
1. `frontend/src/shell/{AppShell,BrandRail,TransportBar}.tsx`: `AppShell`
   layout; `BrandRail` (left rail, brand wordmark, chapter-rail scaffold);
   `TransportBar` (progress/scrubber placeholder + **mode toggle UI** +
   **lang toggle**) + a `ModeContext`/nav-state scaffold (scroll/presentation/
   podcast *scene mechanics* = Area 11). `BRAND` config from
   `import.meta.env.VITE_BRAND_NAME/VITE_BRAND_TAGLINE` (local defaults;
   deployed values injected by Area 02 `deploy:fe` from SSM) — never
   hardcoded.
2. `i18next` ES/EN UI-chrome bundles; global language toggle switches UI +
   content + audio-track selection; persists to `localStorage`.

Verify (spec *Done*):
- "swapping `BRAND` + i18n changes all naming" → a test renders the shell
  with a swapped `BRAND` + locale and asserts all naming updates (no
  component hardcodes the brand).
- "no hardcoded UI strings; toggle persists" → an i18n-key lint/test; reload
  preserves the chosen locale.

## Epic 10.4 — Data layer  (Phase 3)

Goal: typed, zod-validated API client + TanStack Query hooks for all 5
endpoints.

Steps:
1. `frontend/src/api/schemas.ts`: **frontend-owned** zod schemas — `StatsDTO`,
   `InvestigationListItem`, `InvestigationFull`, `EditionDTO`, `FiltersDTO`
   (structurally match Area 09 `backend/src/api/dto.ts`;
   `scenePlan[ch].params` kept **permissive** `z.record(z.unknown())` —
   scene typing via the Area 06 synced `frontend/src/_scene-contract/`).
   Header comment cross-refs Area 09's contract.
2. `frontend/src/api/client.ts`: native `fetch` →
   `Schema.parse(json)` at the boundary; parse failure → typed
   `ApiContractError` (surfaced as an error state). TanStack Query hooks:
   `useStats`, `useInvestigations({family,priority,buyer,minValue,maxValue,
   q,page})`, `useInvestigation(caseKey)`, `useCurrentEdition`, `useFilters`;
   shadcn loading/empty/error states.
3. Run **once**: `pnpm --dir backend run sync:scene-contract` →
   materialises `frontend/src/_scene-contract/` (+ `SCENE_CONTRACT_HASH`);
   document the one-time step + drift risk (Area 06).

Verify (spec *Done*):
- "all four endpoints typed end-to-end; error states designed" → all **5**
  endpoints expose zod-inferred types; `schemas.test.ts` validates a recorded
  sample per endpoint; loading/empty/error render; a deliberately-malformed
  payload triggers the `ApiContractError` path.

---

## Files created (at execution)

`frontend/`: `package.json`, `tsconfig.json`, `vite.config.ts`,
`tailwind.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`
(router + 4 placeholder routes), `src/styles/tokens.css`,
`src/ui/GrainOverlay.tsx` (+ duotone/vignette utils), `src/dev/Tokens.tsx`,
`src/shell/{AppShell,BrandRail,TransportBar}.tsx`, `src/shell/ModeContext.tsx`,
`src/i18n/{index.ts,en.json,es.json}`, `src/brand.ts`,
`src/api/{schemas.ts,client.ts,hooks.ts}`, `src/api/schemas.test.ts`,
`src/_scene-contract/` (synced from Area 06). No edits outside `frontend/`.

## Decisions locked

- `frontend/` fully isolated standalone Vite+React+TS; no `file:../backend`;
  bootstrapped here; `tsconfig.json` extends root base with Vite/React
  overrides; root eslint/prettier/editorconfig/.nvmrc by path.
- **API types frontend-owned + zod-validated** at the data-layer boundary
  (no sync); `scenePlan` params permissive. Scene-contract via Area 06
  hand-synced copy (`sync:scene-contract`).
- Stack pinned (tech_stack.md): Vite/React/TS, Tailwind + shadcn/ui, Framer
  Motion, Recharts, React Flow, React Router, i18next, TanStack Query; native
  `fetch` (no axios).
- Deploy owned by **Area 02 `deploy:fe`**; Area 10 produces
  `frontend/dist/`; SPA fallback = Area 02 CloudFront 403/404→`index.html`.
- Brand from `VITE_BRAND_NAME/VITE_BRAND_TAGLINE` + i18next; never hardcoded.
- Area 10 = shell + 4 routes + tokens + i18n + data layer + **placeholders**;
  views = Areas 11/12; `TransportBar` mode/lang toggle UI + nav-state = Area
  10, scene behaviour = Area 11. Area 10 edits **only `frontend/`**.

## Risks

- **API contract drift** (frontend-owned vs backend `dto.ts`) — user-
  accepted; mitigated by the zod runtime guard (drift = visible parse error)
  + a cross-ref comment + `schemas.test.ts` on recorded samples.
- **tsconfig.base.json is Node-NodeNext** — `frontend/tsconfig.json` must
  override `lib`/`jsx`/`moduleResolution` for Vite/React.
- **Deploy/SPA-fallback/bilingual Verifies** need Area 02 deployed; offline
  coverage = `build`+`typecheck`+unit tests+`vite preview`; deep-link/CF
  check gated on deploy.
- **Scene-contract sync prerequisite**: `frontend/src/_scene-contract/` must
  be materialised (`pnpm --dir backend run sync:scene-contract`) before the
  data layer/scene typing compiles — one-time step + Area 06 drift risk.
- **Placeholder boundary**: route components are placeholders only; Phase-3
  "Dashboard/Newsroom/Article" content is Areas 11/12 — tagged so Area 10
  isn't over-scoped.

## Verification (end-to-end runbook)

```
# offline
pnpm --dir backend run sync:scene-contract                    # once
pnpm --dir frontend install
pnpm --dir frontend typecheck && pnpm --dir frontend lint      # clean
pnpm --dir frontend test                                       # schemas +
                                                               # brand/i18n swap +
                                                               # AA contrast +
                                                               # contract-error
pnpm --dir frontend build                                      # dist/
pnpm --dir frontend preview                                    # local SPA
# deployed (Area 02)
pnpm --dir infrastructure run deploy:fe                        # s3 sync + CF inval
curl -sI https://<cf>/                                         # 200 SPA
curl -sI https://<cf>/investigation/x                          # 200 (fallback)
#  toggle ES/EN in the running app; reload preserves locale
```
All green ⇒ Area 10 satisfies its spec *Done:* criteria and contributes the
deployed-SPA shell + bilingual + data-layer parts of the Phase 3 exit gate
(`00-sequence.dev.md` §4); Dashboard/Newsroom/Article content lands in Areas
11/12.
