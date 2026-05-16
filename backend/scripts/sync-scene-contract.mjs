#!/usr/bin/env node
/* global console, URL */
/**
 * Hand-syncs the canonical scene-contract module into the isolated frontend
 * project (Areas 10/11). There is NO `file:` dep between backend/ and
 * frontend/ — this is a deliberate verbatim copy.
 *
 * - Wipes  frontend/src/_scene-contract/
 * - Copies backend/src/scene-contract/  EXCLUDING test files
 *   (`*.test.ts`, `__fixtures__/`) so the SPA build never pulls vitest types
 * - Writes frontend/src/_scene-contract/SCENE_CONTRACT_HASH = sha256 of the
 *   copied tree (drift detector)
 *
 * Drift between the copy and the canonical module is an accepted, documented
 * risk; this script + the hash marker make it detectable. Area 11 MUST re-run
 * `pnpm --dir backend run sync:scene-contract` before building the SPA.
 *
 * Copy-portability note: the standalone `tsc --noEmit` portability check must
 * exclude test files, e.g.
 *   (cd copy && npx tsc --noEmit $(find . -name '*.ts' ! -name '*.test.ts'))
 */
import { rmSync, mkdirSync, readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const src = join(root, 'backend/src/scene-contract');
const dest = join(root, 'frontend/src/_scene-contract');

const isExcluded = (rel) =>
  rel.includes('__fixtures__') || rel.endsWith('.test.ts') || rel.endsWith('.compat.test.ts');

/** Recursively list copied files (relative paths), excluding tests/fixtures. */
function listFiles(dir, base = dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const abs = join(dir, name);
    const rel = relative(base, abs);
    if (statSync(abs).isDirectory()) {
      out.push(...listFiles(abs, base));
    } else if (!isExcluded(rel)) {
      out.push(rel);
    }
  }
  return out.sort();
}

function main() {
  const files = listFiles(src);

  // Wipe + recreate destination.
  rmSync(dest, { recursive: true, force: true });
  mkdirSync(dest, { recursive: true });

  const hash = createHash('sha256');
  for (const rel of files) {
    const content = readFileSync(join(src, rel));
    const target = join(dest, rel);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
    // Hash the path + content so reordering/renames change the marker.
    hash.update(rel);
    hash.update('\0');
    hash.update(content);
  }

  const digest = hash.digest('hex');
  writeFileSync(join(dest, 'SCENE_CONTRACT_HASH'), digest + '\n');

  console.log(`sync:scene-contract — copied ${files.length} file(s) → ${relative(root, dest)}`);
  console.log(`SCENE_CONTRACT_HASH = ${digest}`);
}

main();
