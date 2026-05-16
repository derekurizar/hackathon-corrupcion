import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadConfig } from './env.js';

describe('loadConfig()', () => {
  let savedMongoUri: string | undefined;
  let savedRunAudio: string | undefined;

  beforeEach(() => {
    savedMongoUri = process.env['MONGODB_URI'];
    savedRunAudio = process.env['RUN_AUDIO'];
    delete process.env['MONGODB_URI'];
    delete process.env['RUN_AUDIO'];
  });

  afterEach(() => {
    if (savedMongoUri !== undefined) {
      process.env['MONGODB_URI'] = savedMongoUri;
    } else {
      delete process.env['MONGODB_URI'];
    }
    if (savedRunAudio !== undefined) {
      process.env['RUN_AUDIO'] = savedRunAudio;
    } else {
      delete process.env['RUN_AUDIO'];
    }
  });

  it('throws with MONGODB_URI in the message when it is missing', () => {
    expect(() => loadConfig()).toThrow(/MONGODB_URI/);
  });

  it('returns typed config with defaults when only MONGODB_URI is set', () => {
    process.env['MONGODB_URI'] = 'mongodb+srv://test:test@cluster.mongodb.net/db';
    const cfg = loadConfig();
    expect(cfg.MONGODB_URI).toBe('mongodb+srv://test:test@cluster.mongodb.net/db');
    expect(cfg.RUN_BENCHMARKS).toBe(true);
    expect(cfg.INGEST_ONLY).toBe(false);
    expect(cfg.MAX_INVESTIGATIONS_PER_RUN).toBe(20);
  });

  it('parses RUN_AUDIO="false" as false (guards against z.coerce.boolean trap)', () => {
    process.env['MONGODB_URI'] = 'mongodb+srv://test:test@cluster.mongodb.net/db';
    process.env['RUN_AUDIO'] = 'false';
    const cfg = loadConfig();
    expect(cfg.RUN_AUDIO).toBe(false);
  });
});
