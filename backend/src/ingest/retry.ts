/**
 * Tiny exponential-backoff retry — no external dependency.
 *
 * Used for network / unzip / stream failures during ingest. After exhausting
 * `retries` re-attempts, rethrows a single error that carries the last
 * underlying message as context (so the failure surfaces cleanly instead of
 * being swallowed).
 *
 * `retries` is the number of *re-attempts* (total tries = retries + 1).
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts?: { retries?: number; baseMs?: number },
): Promise<T> {
  const retries = opts?.retries ?? 3;
  const baseMs = opts?.baseMs ?? 500;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, baseMs * 2 ** attempt));
      }
    }
  }
  throw new Error(
    `Failed after ${retries + 1} attempts: ${
      lastErr instanceof Error ? lastErr.message : String(lastErr)
    }`,
  );
}
