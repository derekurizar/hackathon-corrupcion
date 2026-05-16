import { mkdtempSync, readFileSync, existsSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Investigation } from '../schema/index.js';
import { writePublishArtifact } from './publish-artifact.js';

const safe = (s: string): string => s.replace(/[^a-zA-Z0-9._-]/g, '-');

// writePublishArtifact only reads `_id` + `version` and JSON-serializes the
// rest, so a minimal stand-in is enough (no schema validation involved).
const doc = {
  _id: 'BUY-2024-F1-001',
  version: 3,
  buyer: { id: 'b1', name: 'Ministerio' },
} as unknown as Investigation;

describe('writePublishArtifact', () => {
  let savedLogDir: string | undefined;

  beforeEach(() => {
    savedLogDir = process.env['LOG_DIR'];
  });

  afterEach(() => {
    if (savedLogDir === undefined) delete process.env['LOG_DIR'];
    else process.env['LOG_DIR'] = savedLogDir;
  });

  it('writes the full doc as JSON before the upsert', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'pubart-'));
    process.env['LOG_DIR'] = dir;
    const runId = 'run-2026-05-16T00:00:00.000Z';

    await writePublishArtifact(runId, doc);

    const expected = join(dir, 'publish', safe(runId), 'BUY-2024-F1-001-v3.json');
    expect(existsSync(expected)).toBe(true);
    expect(JSON.parse(readFileSync(expected, 'utf8'))).toEqual(doc);
  });

  it('never throws when the destination is unwritable', async () => {
    const base = mkdtempSync(join(tmpdir(), 'pubart-'));
    // Use a regular file as the LOG_DIR so mkdir fails with ENOTDIR.
    const filePath = join(base, 'not-a-dir');
    writeFileSync(filePath, 'x');
    process.env['LOG_DIR'] = filePath;

    await expect(writePublishArtifact('run-x', doc)).resolves.toBeUndefined();
  });
});
