import { moduleLogger } from '../obs/logger.js';

const log = moduleLogger('api/respond');

/**
 * Plain HTTP envelope. Defined as a local interface (NOT an imported AWS type
 * at value level) so `backend/src` stays AWS-SDK-free. It is structurally
 * assignable to `APIGatewayProxyStructuredResultV2`, so handlers can return it
 * as `APIGatewayProxyResultV2` (type-only import).
 */
export interface ApiResult {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

/** Per-endpoint Cache-Control values (same-origin via CloudFront — no CORS). */
export const CACHE = {
  stats: 'public, max-age=60',
  investigationsList: 'public, max-age=30',
  article: 'public, max-age=300',
  editions: 'public, max-age=120',
  filters: 'public, max-age=300',
} as const;

export function ok(
  body: unknown,
  opts?: { cacheControl?: string },
): ApiResult {
  return {
    statusCode: 200,
    headers: {
      'content-type': 'application/json',
      'cache-control': opts?.cacheControl ?? 'public, max-age=60',
    },
    body: JSON.stringify(body),
  };
}

/**
 * Static/sanitized error envelope. `message` MUST be a caller-supplied static
 * string — never an exception's internals (no stack / no DB error text).
 */
export function fail(code: 400 | 404 | 500, message: string): ApiResult {
  log(`response=error code=${code} message=${JSON.stringify(message)}`);
  return {
    statusCode: code,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ error: { code, message } }),
  };
}
