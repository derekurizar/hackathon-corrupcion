# backend

Canonical shared TypeScript package for the Open Contract Newsroom: OCDS input
types, Zod schemas, the memoized Mongo client, pipeline stage functions, and the
pure **scene-contract** module. Consumed by `data-integestion/` and
`infrastructure/` via `file:../backend`. No pnpm workspace; no `@core` alias.

## Purity rule

`backend/src/` must never import `@aws-sdk` / `aws-sdk`. The
`backend/src/scene-contract/` shipped module additionally must not import
`react`, `mongodb`, anything under `backend/src/db/`, or any value/relative
import from `backend/src/schema`. Verify:

```
grep -rEn "react|mongodb|@aws-sdk|/db/|src/schema" backend/src/scene-contract
# → no matches
```

(The one allowed exception is `scene-plan.compat.test.ts`, which imports Area 03
types via the package specifier `from 'backend'` — never a relative
`../schema/...` path — so the grep above does not match it.)

## Scene-contract → frontend sync

The scene-contract module lives canonically in `backend/src/scene-contract/`.
The Vite SPA in `frontend/` (Areas 10/11) is an **isolated project with no
`file:` dependency on backend**, so it consumes a hand-synced verbatim copy at
`frontend/src/_scene-contract/`.

Refresh the copy with:

```
pnpm --dir backend run sync:scene-contract
```

This wipes `frontend/src/_scene-contract/`, copies
`backend/src/scene-contract/` **excluding test files** (`*.test.ts`,
`__fixtures__/`) so the SPA build never pulls vitest types, and writes
`frontend/src/_scene-contract/SCENE_CONTRACT_HASH` (sha256 over the copied
path+content tree) as a drift marker.

Drift between the copy and the canonical module is an **accepted, documented
risk**; the hash marker makes it detectable. **Area 11 must re-run the sync
before building the SPA.** The target materializes once `frontend/` exists
(Areas 10/11) — Area 06 ships the script and this doc only.

### Copy-portability

The module is self-contained: it defines its own input view-types
(`SceneSignal`, `SceneEvidenceItem`, `SceneInvestigation`) and has zero
cross-imports, so a verbatim folder copy compiles standalone. The standalone
`tsc --noEmit` portability check must **exclude test files**:

```
tmp=$(mktemp -d) && cp -r backend/src/scene-contract "$tmp"/sc \
  && (cd "$tmp"/sc && npx tsc --noEmit --strict --module nodenext \
        --moduleResolution nodenext \
        $(find . -name '*.ts' ! -name '*.test.ts'))
```
