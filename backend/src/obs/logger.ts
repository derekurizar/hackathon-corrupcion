import { join } from 'node:path';
import pino from 'pino';
import pretty from 'pino-pretty';

/**
 * Centralized structured logger (pino) shared by the whole backend + the
 * data-ingestion CLI. Replaces the per-module
 * `const log = (m) => console.error(`[mod] ${m}`)` helpers.
 *
 * Sinks (pino.multistream):
 *  - console → stderr (preserves prior `console.error` behavior): pretty
 *    locally, raw JSON in Lambda (CloudWatch-friendly).
 *  - file → one per-run file under `resolveLogDir()` (raw JSON), so a run's
 *    full ingestion/generation trace survives after the terminal scrolls.
 *
 * Self-contained: reads `process.env` directly (NOT `loadConfig()`, which
 * throws on a missing `MONGODB_URI` and would couple logging to full config).
 * Never throws — a broken/read-only file sink degrades to stderr only.
 */

const PINO_LEVELS = new Set(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']);

/** `LOG_LEVEL` env, validated against pino levels. Unknown/empty → `info`. */
export function resolveLogLevel(): string {
  const lvl = process.env['LOG_LEVEL']?.toLowerCase();
  return lvl && PINO_LEVELS.has(lvl) ? lvl : 'info';
}

function isLambda(): boolean {
  return Boolean(process.env['AWS_LAMBDA_FUNCTION_NAME']);
}

/**
 * Base directory for persistent log files and publish artifacts.
 * Precedence: explicit `LOG_DIR` → `/tmp/logs` in Lambda → `<cwd>/logs`.
 */
export function resolveLogDir(): string {
  const explicit = process.env['LOG_DIR'];
  if (explicit && explicit.length > 0) return explicit;
  if (isLambda()) return '/tmp/logs';
  return join(process.cwd(), 'logs');
}

function buildRootLogger(): pino.Logger {
  const level = resolveLogLevel();
  const streams: pino.StreamEntry[] = [];

  // Console stream → stderr (matches the prior `console.error` convention).
  if (isLambda()) {
    streams.push({ stream: pino.destination({ dest: 2, sync: true }) });
  } else {
    streams.push({
      stream: pretty({
        colorize: true,
        destination: 2,
        sync: true,
        translateTime: 'SYS:HH:MM:ss.l',
        ignore: 'pid,hostname,module',
        messageFormat: '[{module}] {msg}',
      }),
    });
  }

  // Persistent per-run file. Skipped under vitest to keep test runs clean.
  if (process.env['VITEST'] !== 'true') {
    try {
      const file = join(
        resolveLogDir(),
        `run-${new Date().toISOString().replace(/[:.]/g, '-')}.log`,
      );
      const dest = pino.destination({
        dest: file,
        sync: true,
        mkdir: true,
        append: true,
      });
      // SonicBoom surfaces late open/write failures via 'error' — swallow so
      // a bad file sink can never crash the pipeline.
      dest.on('error', (err: unknown) => {
        console.error(
          `[logger] file sink error: ${err instanceof Error ? err.message : String(err)}`,
        );
      });
      streams.push({ stream: dest });
    } catch (err) {
      // Read-only FS / permission error at open time — stderr only.
      console.error(
        `[logger] file sink disabled: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  return pino({ level }, pino.multistream(streams));
}

let rootLogger: pino.Logger | undefined;

/** Lazily build the singleton so importing the pure resolvers is side-effect free. */
function getRoot(): pino.Logger {
  if (!rootLogger) rootLogger = buildRootLogger();
  return rootLogger;
}

/**
 * Drop-in replacement for the legacy per-module helper. Returns a function
 * with the exact same `(m: string) => void` signature so every existing
 * `log(...)` call site and message string stays byte-identical.
 */
export function moduleLogger(module: string): (m: string) => void {
  const child = getRoot().child({ module });
  return (m: string): void => {
    child.info(m);
  };
}
