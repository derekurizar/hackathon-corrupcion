import type { z } from 'zod';
import { ApiContractError } from './schemas';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

/**
 * Native fetch → Zod parse. Any contract mismatch surfaces as an
 * `ApiContractError` (drift detector for the hand-synced DTO mirror).
 */
export async function apiGet<T>(
  endpoint: string,
  schema: z.ZodType<T>,
  init?: RequestInit,
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const res = await fetch(url, {
    ...init,
    headers: { Accept: 'application/json', ...init?.headers },
  });

  if (!res.ok) {
    throw new Error(`API ${endpoint} failed: ${res.status} ${res.statusText}`);
  }

  const json: unknown = await res.json();
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    throw new ApiContractError(endpoint, parsed.error.issues);
  }
  return parsed.data;
}
