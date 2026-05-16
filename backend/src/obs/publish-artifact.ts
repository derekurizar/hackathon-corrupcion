import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Investigation } from '../schema/index.js';
import { moduleLogger, resolveLogDir } from './logger.js';

const log = moduleLogger('publish');

/** Filesystem-safe slug (runId contains `:`/`.` from the ISO timestamp). */
function sanitize(s: string): string {
  return s.replace(/[^a-zA-Z0-9._-]/g, '-');
}

/**
 * Persist the fully validated `Investigation` to disk *before* it is upserted
 * into MongoDB, so every published doc (including ones the evidenceHash guard
 * later skips) can be inspected/diffed.
 *
 * Path: `<resolveLogDir()>/publish/<runId>/<caseKey>-v<version>.json`.
 *
 * Strictly best-effort: any failure is logged and swallowed — writing an
 * artifact must never block or fail a publish.
 */
export async function writePublishArtifact(runId: string, doc: Investigation): Promise<void> {
  try {
    const dir = join(resolveLogDir(), 'publish', sanitize(runId));
    await mkdir(dir, { recursive: true });
    const file = join(dir, `${sanitize(doc._id)}-v${doc.version}.json`);
    await writeFile(file, JSON.stringify(doc, null, 2), 'utf8');
  } catch (err) {
    log(
      `artifact_write_failed case=${doc._id} ` +
        `err="${err instanceof Error ? err.message : String(err)}"`,
    );
  }
}
