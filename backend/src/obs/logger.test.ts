import { join } from 'node:path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resolveLogLevel, resolveLogDir, moduleLogger } from './logger.js';

const KEYS = ['LOG_LEVEL', 'LOG_DIR', 'AWS_LAMBDA_FUNCTION_NAME'] as const;

describe('logger', () => {
  let saved: Record<string, string | undefined>;

  beforeEach(() => {
    saved = {};
    for (const k of KEYS) {
      saved[k] = process.env[k];
      delete process.env[k];
    }
  });

  afterEach(() => {
    for (const k of KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  describe('resolveLogLevel', () => {
    it('defaults to info when unset', () => {
      expect(resolveLogLevel()).toBe('info');
    });

    it('honors a valid LOG_LEVEL (case-insensitive)', () => {
      process.env['LOG_LEVEL'] = 'DEBUG';
      expect(resolveLogLevel()).toBe('debug');
    });

    it('falls back to info for an unknown value (never throws)', () => {
      process.env['LOG_LEVEL'] = 'verbose';
      expect(resolveLogLevel()).toBe('info');
    });
  });

  describe('resolveLogDir', () => {
    it('honors an explicit LOG_DIR', () => {
      process.env['LOG_DIR'] = '/custom/logs';
      expect(resolveLogDir()).toBe('/custom/logs');
    });

    it('uses /tmp/logs in Lambda when LOG_DIR is unset', () => {
      process.env['AWS_LAMBDA_FUNCTION_NAME'] = 'fn';
      expect(resolveLogDir()).toBe('/tmp/logs');
    });

    it('LOG_DIR wins over the Lambda default', () => {
      process.env['AWS_LAMBDA_FUNCTION_NAME'] = 'fn';
      process.env['LOG_DIR'] = '/explicit';
      expect(resolveLogDir()).toBe('/explicit');
    });

    it('defaults to <cwd>/logs locally', () => {
      expect(resolveLogDir()).toBe(join(process.cwd(), 'logs'));
    });
  });

  describe('moduleLogger', () => {
    it('returns a callable that does not throw', () => {
      const log = moduleLogger('test');
      expect(typeof log).toBe('function');
      expect(() => log('hello from test')).not.toThrow();
    });
  });
});
