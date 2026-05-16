import { describe, it, expect } from 'vitest';
import { CACHE, fail, ok } from './respond.js';

describe('ok', () => {
  it('returns 200, JSON content-type, parseable body and default cache', () => {
    const r = ok({ a: 1 });
    expect(r.statusCode).toBe(200);
    expect(r.headers['content-type']).toBe('application/json');
    expect(r.headers['cache-control']).toBe('public, max-age=60');
    expect(JSON.parse(r.body)).toEqual({ a: 1 });
  });

  it('honors an explicit cache-control', () => {
    const r = ok({ a: 1 }, { cacheControl: CACHE.article });
    expect(r.headers['cache-control']).toBe('public, max-age=300');
  });

  it('emits no CORS headers (same-origin via CloudFront)', () => {
    const r = ok({ a: 1 });
    expect(r.headers['access-control-allow-origin']).toBeUndefined();
  });
});

describe('fail', () => {
  it('400 returns a sanitized error envelope with no internal fields', () => {
    const r = fail(400, 'bad param');
    expect(r.statusCode).toBe(400);
    const body = JSON.parse(r.body);
    expect(body).toEqual({ error: { code: 400, message: 'bad param' } });
    expect(JSON.stringify(body)).not.toMatch(/stack|at Object|node_modules/);
  });

  it('404 maps to statusCode 404', () => {
    expect(fail(404, 'not found').statusCode).toBe(404);
  });

  it('500 maps to statusCode 500', () => {
    const r = fail(500, 'server error');
    expect(r.statusCode).toBe(500);
    expect(JSON.parse(r.body).error.message).toBe('server error');
  });
});
