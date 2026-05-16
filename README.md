# hackathon-corrupcion

## Project layout & conventions

This repo is **four fully isolated, standalone TypeScript projects** — there is
**no pnpm workspace** and no `pnpm -r`. Every command is run **per folder** with
`pnpm --dir <folder> …`.

| Folder | Role | Owning area |
|---|---|---|
| `backend/` | **Canonical** shared code: OCDS input types, `CuratedRelease` Zod schema, config loader, memoized Mongo client, pipeline stage functions | 01 (bootstrap), 03/04/05/07 (flesh out) |
| `data-integestion/` | Dev-loop **CLI runner**; consumes `backend/` via `file:../backend` | 01 (skeleton), 04 (ingest impl) |
| `frontend/` | Vite + React SPA | 10 |
| `infrastructure/` | Single AWS CDK app | 02 |

> The folder name `data-integestion` is spelled exactly that way on purpose — do
> not "fix" it.

### Why no workspace

Each folder installs and builds in isolation so that the AWS Lambda / CDK
bundling, the CLI dev loop, and the SPA never share a hoisted `node_modules` or
a single root build graph. There is **no `@core` alias**: the shared code is the
`backend` package, consumed by `data-integestion` through a local `file:`
dependency (`"backend": "file:../backend"`).

### Purity rule

`backend/src/` must **never** import `@aws-sdk` or `aws-sdk`. AWS SDK usage
belongs only in `data-integestion/` and `infrastructure/`. Lambda handlers in
`backend/src/handlers/` (added later) are thin and import `aws-lambda`
type-only.

### Shared root config (by path, not workspace)

`tsconfig.base.json`, `eslint.config.mjs` (ESLint 9 flat config), `.prettierrc`,
`.editorconfig`, `.nvmrc`, `.gitignore`, `.env.example`. Each folder's
`tsconfig.json` does `"extends": "../tsconfig.base.json"` and lint runs with
`eslint . --config ../eslint.config.mjs`.

### Per-folder commands

```bash
pnpm --dir backend install
pnpm --dir backend build       # tsc -b
pnpm --dir backend test        # vitest run
pnpm --dir backend lint
pnpm --dir backend typecheck   # tsc --noEmit

pnpm --dir data-integestion install
pnpm --dir data-integestion typecheck
pnpm --dir data-integestion lint
pnpm --dir data-integestion cli --help
pnpm --dir data-integestion cli ping   # requires a real MONGODB_URI in /.env
```

### Env loading

No `dotenv` dependency. Use Node's `--env-file`. The CLI script uses
`node --env-file-if-exists=../.env --import tsx src/cli.ts` so that offline
commands (`--help`, not-yet-implemented stubs) run even when no `.env` exists,
while `cli ping` still needs a real `MONGODB_URI`. Copy `.env.example` to `.env`
at the repo root and fill in `MONGODB_URI` (and other keys as areas need them).
`.env` is git-ignored; `.env.example` is a committed template.

### `file:` re-link step (important)

`data-integestion` depends on `backend` via `file:../backend`. After editing
`backend`, you must rebuild `backend` (`pnpm --dir backend build`) and re-link
in the consumer (`pnpm --dir data-integestion install`) before the built output
is visible. In dev, the `cli` script uses `tsx`, which runs `backend` TypeScript
source directly, so a rebuild is not required for the CLI dev loop.

### Scaffolding a new isolated folder

A new standalone folder (e.g. `frontend/`, `infrastructure/`) follows the same
baseline: its own `package.json` (`private`, `type: "module"`,
`engines.node: ">=20"`, pinned `packageManager`), a `tsconfig.json` that
`extends "../tsconfig.base.json"`, lint via `--config ../eslint.config.mjs`, and
Vitest for tests. It consumes shared code via `"backend": "file:../backend"` —
never a workspace and never a `@core` alias.