# 01 — Workspace & Tooling (dev plan)

Spec: [`../01-workspace-tooling.md`](../01-workspace-tooling.md) | Idea refs:
`../../idea/01-architecture.md`, `../../idea/06-data-model.md`,
`../../idea/README.md`
Phase: 0 | Depends on: — | Blocks: all areas (foundation)
Prereqs (see `00-sequence.dev.md` §2): Node 20 (`.nvmrc`), pnpm installed;
`MONGODB_URI` in `.env` and Atlas reachable; root `.gitignore` committed
**before** the first build.

## Structural deviation from spec

The spec assumes a pnpm **workspace** with `@core`/`@handlers`/`@scene-contract`
packages. Per the user's decision this repo uses **four fully isolated
standalone TS projects, no workspace**:

| Folder | Role | Area that owns it |
|---|---|---|
| `backend/` | **Canonical** shared code: OCDS types, `CuratedRelease` schema, config, Mongo client, stage logic | 01 (bootstrap), 03/04/05/07 (flesh out) |
| `data-integestion/` | Dev-loop **CLI runner**; consumes `backend/` via `file:../backend` | 01 (skeleton), 04 (ingest impl) |
| `frontend/` | Vite + React SPA | 10 |
| `infrastructure/` | Single AWS CDK app | 02 |

- No `@core`/`@scene-contract` aliases — shared code is the `backend` package,
  consumed by `data-integestion` through a local `file:` dependency.
- The spec's `@scene-contract` package → `backend/src/scene-contract/` module,
  built in **Area 06** (not created here).
- Area 01 bootstraps **only** `backend/` + `data-integestion/`; it *documents*
  the standalone tooling baseline that Areas 02 / 10 apply to their own folder.
- Root-level config files are shared by **path reference**, not a workspace.

---

## Epic 1.1 — Standalone-project tooling baseline

Goal: `backend/` and `data-integestion/` are isolated TS projects sharing a
documented tooling baseline; build/test/lint/typecheck pass on stubs.

Steps:
1. Repo-root shared (non-workspace) config:
   - `.nvmrc` → `20`
   - `tsconfig.base.json` → `strict: true`, `noUncheckedIndexedAccess`,
     `exactOptionalPropertyTypes`, `target: ES2022`, `module: NodeNext`,
     `moduleResolution: NodeNext`, `declaration: true`, `esModuleInterop`,
     `skipLibCheck`, `forceConsistentCasingInFileNames`.
   - `.prettierrc` (single quotes, trailing comma, 100 print width).
   - `eslint.config.mjs` → ESLint 9 flat config: `typescript-eslint`
     recommended + `eslint-config-prettier` last; ignores `**/dist`.
   - `.editorconfig` (utf-8, lf, 2-space).
2. `backend/package.json`: `private`, `name: "backend"`, `type: "module"`,
   `engines.node: ">=20"`, `packageManager` pinned; devDeps `typescript`,
   `vitest`, `eslint`, `@eslint/js`, `typescript-eslint`,
   `eslint-config-prettier`, `prettier`; scripts `build: tsc -b`,
   `typecheck: tsc --noEmit`, `test: vitest run`,
   `lint: eslint . --config ../eslint.config.mjs`,
   `format: prettier --write .`.
   `backend/tsconfig.json` extends `../tsconfig.base.json`
   (`rootDir: src`, `outDir: dist`, `composite: true`).
   `backend/src/index.ts` → trivial stub export (replaced in 1.2/1.4).
3. `data-integestion/package.json`: same baseline + `tsx` devDep;
   dependency `"backend": "file:../backend"`;
   `data-integestion/tsconfig.json` extends base;
   `data-integestion/src/index.ts` + `data-integestion/src/cli.ts` stubs.
4. Top-level `README.md` → add **"Project layout & conventions"**: no-workspace
   rationale, the 4 isolated folders + ownership table above, `backend` =
   canonical, `file:` consumption + re-link note, how to scaffold a new
   isolated folder against the root configs.

Verify (spec *Done:* lines, adapted — no workspace `-r`):
- *"`pnpm -r build` runs clean on empty stubs"* → `pnpm install && pnpm build`
  exits 0 in `backend/`, then in `data-integestion/`.
- *"a cross-package import type-checks"* → add a type import from `backend` in
  `data-integestion/src/index.ts`; `pnpm --dir data-integestion typecheck`
  passes.
- *"one trivial test passes in `core`"* → `pnpm --dir backend test` runs one
  trivial Vitest test green.
- *"lint passes on the skeleton"* → `pnpm --dir backend lint` and
  `pnpm --dir data-integestion lint` exit clean.

## Epic 1.2 — Shared OCDS types + `CuratedRelease` schema (in `backend/`)

Goal: `backend/` exposes the verbatim OCDS input types and a Zod
`CuratedRelease` schema/type; `data-integestion/` can import them via `file:`.

Steps:
1. Copy `planning/assets/guatecompras_observed_types.ts` **verbatim** →
   `backend/src/ocds/guatecompras-observed-types.ts` (no edits; file is
   import-free / self-contained). `backend/src/ocds/index.ts` →
   `export * from './guatecompras-observed-types.js'`.
2. Add `zod` to `backend` deps. `backend/src/schema/curated-release.ts` →
   `CuratedReleaseSchema` per `idea/06-data-model.md` (all fields **required**):
   `ocid,id,date` (ISO `z.string()`), `year,month` (`z.number().int()`),
   `buyer{id,name}`, `tender{id,title,statusDetails,procurementMethodDetails,
   mainProcurementCategory,numberOfTenderers:int,datePublished,
   tenderPeriod{startDate, endDate: z.string().nullable()},
   items[]{classificationId,scheme,description,quantity:number,unitName},
   itemFamilies:string[], documentsSummary{count:int,types:string[],
   firstDatePublished}}`, `bids[]{status,amount:number,tendererId}`,
   `bidCounts{count:int,valid:int,disqualified:int}`,
   `awards[]{id,date,status,statusDetails,value{amount:number,currency},
   supplierIds:string[]}`,
   `contracts[]{id,awardID,dateSigned,value{amount:number,currency},
   period{start,end},documentsCount:int,contractNumber}`, `region`.
   Money = `z.number()`. `export type CuratedRelease =
   z.infer<typeof CuratedReleaseSchema>`.
3. `backend/src/index.ts` re-exports `./ocds/index.js` + `./schema/
   curated-release.js` (public surface for the `file:` consumer).
4. `backend/src/schema/curated-release.test.ts` (Vitest): a hand-built valid
   `CuratedRelease` fixture → `parse` succeeds; a malformed fixture (e.g.
   `awards[].value.amount` a string) → `safeParse` fails.

Verify:
- *"`@core` exposes the OCDS input types unchanged"* →
  `diff backend/src/ocds/guatecompras-observed-types.ts
  planning/assets/guatecompras_observed_types.ts` prints nothing;
  `import type { CompiledRelease } from 'backend'` typechecks from
  `data-integestion`.
- *"`CuratedRelease` Zod schema + inferred type compile; unit test parses a
  hand-built fixture"* → `pnpm --dir backend test` passes the
  `curated-release` test.

## Epic 1.3 — Config & secrets (local) — loader in `backend/`

Goal: a typed, Zod-validated config in `backend/`; missing-required throws a
clear aggregated error; `.env` is git-ignored.

Steps:
1. Root `.env.example`: `MONGODB_URI`, `ANTHROPIC_API_KEY`,
   `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ES`, `ELEVENLABS_VOICE_EN`,
   `MAX_INVESTIGATIONS_PER_RUN=20`, toggles `RUN_BENCHMARKS`, `RUN_DETECTION`,
   `RUN_STORY`, `RUN_AUDIO`, `RUN_PUBLISH`, `INGEST_ONLY`, `BRAND_NAME`,
   `BRAND_TAGLINE` — each with a one-line comment.
2. `backend/src/config/env.ts`: Zod schema over `process.env`. Required
   **now** = `MONGODB_URI` only; `ANTHROPIC_API_KEY` optional until Area 07,
   `ELEVENLABS_*` optional until Phase 2 (commented). Toggles `z`-coerced
   booleans with defaults; `MAX_INVESTIGATIONS_PER_RUN` coerced int default 20.
   `loadConfig(): Config` — on failure, throw one `Error` whose message lists
   **every** missing/invalid key.
3. Env loading via Node 20.6+ `node --env-file=.env` (no `dotenv` dep);
   documented in README; CLI scripts (1.4) pass `--env-file`.
4. Root `.gitignore`: `.env`, `**/dist`, `**/node_modules`, `cdk.out`,
   `coverage`, `.DS_Store`. Commit before the first build.

Verify:
- *"typed config object; missing-required throws with a clear message"* →
  Vitest: with `MONGODB_URI` unset `loadConfig()` throws and the message
  contains `MONGODB_URI`; with it set it returns a typed object.
- *"`git status` clean after a build"* → after `pnpm --dir backend build`,
  `git status --porcelain` is empty (`dist/` ignored).

## Epic 1.4 — CLI dev-loop runner + memoized Mongo client

Goal: `data-integestion/` CLI exposes `ingest|benchmarks|detect|generate|
publish` as thin wrappers over `backend` stage stubs; one memoized Mongo
client; real-Atlas smoke green.

Steps:
1. `backend/src/db/client.ts`: `getMongoClient()` — memoized module-level
   cached `MongoClient` promise from `loadConfig().MONGODB_URI`; `getDb()`;
   `closeMongo()`. Minimal — **Area 03 owns the full access layer /
   repositories** (cross-ref); add `mongodb` dep.
2. `backend/src/stages/index.ts`: async placeholders `ingest`, `benchmarks`,
   `detect`, `generate`, `publish` — log the stage then
   `throw new Error('not implemented — Area 04/05/07')`. Export from
   `backend/src/index.ts`. **No AWS imports anywhere in `backend`.**
3. `data-integestion/src/cli.ts`: parse `argv` with `node:util` `parseArgs`;
   subcommands `ingest|benchmarks|detect|generate|publish` (thin wrappers
   importing the matching fn from `backend`) + `--help` listing them + a
   `ping` smoke subcommand: `getMongoClient()` →
   `db.admin().command({ ping: 1 })` → `closeMongo()` → print `ok`.
4. `data-integestion/package.json` script
   `"cli": "node --env-file=../.env --import tsx src/cli.ts"`.

Verify:
- *"`pnpm cli --help` lists subcommands; each is a thin wrapper (no AWS)"* →
  `pnpm --dir data-integestion cli --help` prints the 5 subcommands;
  `grep -rE "@aws-sdk|'aws-sdk'" backend/src data-integestion/src` → no matches
  (`@core` purity).
- *"CLI connects once; integration smoke test green"* →
  `pnpm --dir data-integestion cli ping` connects to real Atlas (§2
  `MONGODB_URI`) and prints `ok`; backend Vitest asserts two `getMongoClient()`
  calls return the **same** instance (memoization).

---

## Files created (at execution)

Root: `.nvmrc`, `tsconfig.base.json`, `.prettierrc`, `eslint.config.mjs`,
`.editorconfig`, `.gitignore`, `.env.example`, `README.md` (append section).
`backend/`: `package.json`, `tsconfig.json`, `src/index.ts`,
`src/ocds/{guatecompras-observed-types.ts,index.ts}`,
`src/schema/curated-release.ts`, `src/schema/curated-release.test.ts`,
`src/config/env.ts` (+ test), `src/db/client.ts` (+ memoization test),
`src/stages/index.ts`.
`data-integestion/`: `package.json`, `tsconfig.json`, `src/index.ts`,
`src/cli.ts`.

## Decisions locked

- No pnpm workspace; 4 isolated standalone TS projects.
- `backend/` canonical; `data-integestion/` consumes it via `file:../backend`.
- Shared root config by path: `tsconfig.base.json`, `eslint.config.mjs`
  (ESLint 9 flat), `.prettierrc`, `.editorconfig`, `.nvmrc`, `.gitignore`,
  `.env.example`.
- Build = `tsc -b` per folder; tests = Vitest per folder; env =
  `node --env-file` (no `dotenv`); CLI args = `node:util` `parseArgs`; dev run
  = `tsx`.
- Area 01 bootstraps only `backend/` + `data-integestion/`; `infrastructure/`→
  Area 02, `frontend/`→ Area 10.
- `@scene-contract` → `backend/src/scene-contract/` (Area 06).

## Risks

- **`file:` link staleness** — after editing `backend`, `data-integestion`
  must `pnpm install` (re-link) and `backend` must be rebuilt before the CLI
  sees changes. Mitigate: `tsx` runs `backend` TS source directly in dev;
  document the re-link step in README.
- **No root orchestration** — no `pnpm -r`; every command is per-folder
  (`pnpm --dir <folder> …`). Phase-gate commands updated accordingly.
- **Atlas reachability** — `cli ping` needs a real reachable `MONGODB_URI`
  (§2 prereq); failure here is a prerequisites problem, not an Area 01 bug.

## Verification (end-to-end runbook)

```
# from repo root
pnpm --dir backend install && pnpm --dir backend build      # 0 exit
pnpm --dir backend lint && pnpm --dir backend test           # green
pnpm --dir data-integestion install                          # links backend
pnpm --dir data-integestion typecheck                        # cross-import OK
pnpm --dir data-integestion lint                              # clean
pnpm --dir data-integestion cli --help                        # 5 subcommands
pnpm --dir data-integestion cli ping                          # -> ok (Atlas)
diff backend/src/ocds/guatecompras-observed-types.ts \
     planning/assets/guatecompras_observed_types.ts           # empty
git status --porcelain                                        # empty
```
All green ⇒ Area 01 satisfies its spec *Done:* criteria and contributes its
share of the Phase 0 exit gate (`00-sequence.dev.md` §4).
