# 10 — Frontend Foundation

Spec refs: `../idea/05-frontend.md` (design system, routes, i18n, shell),
`../idea/00` (brand). Phase 3. Depends on: 09.

## Epic 10.1 — App scaffold
- [ ] Vite + React + TS SPA; Tailwind + shadcn/ui; build → static for
  S3/CloudFront.
  *Done:* `pnpm deploy:fe` serves the app on the CF URL.
- [ ] React Router routes `/`, `/newsroom`, `/investigation/:caseKey`,
  `/methodology`; SPA fallback works on deep links.
  *Done:* refresh on a deep link resolves (CF→index.html).

## Epic 10.2 — Design system (noir tokens)
- [ ] Token layer from `../idea/05`: palette, type scale (display/body/
  numeric), grain/vignette/duotone utilities, priority colors.
  *Done:* a token preview page matches the `../assets/ui_idea.png` language;
  AA contrast checked.
- [ ] `GrainOverlay`, duotone image treatment via CSS blend (no heavy
  assets).
  *Done:* applied without measurable jank.

## Epic 10.3 — Shell & i18n
- [ ] `AppShell`, `BrandRail`, `TransportBar` (progress/scrubber/mode+lang
  toggles); brand strictly from `BRAND` config/i18n (never hardcoded).
  *Done:* swapping `BRAND` + i18n changes all naming.
- [ ] `i18next` ES/EN; global toggle switches UI + content + audio track.
  *Done:* no hardcoded UI strings; toggle persists.

## Epic 10.4 — Data layer
- [ ] Typed API client (shared types from `@core`/`@scene-contract`),
  TanStack Query, loading/empty/error states.
  *Done:* all four endpoints typed end-to-end; error states designed.
