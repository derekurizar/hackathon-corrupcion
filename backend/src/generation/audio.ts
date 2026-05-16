import { loadConfig } from '../config/env.js';
import { moduleLogger } from '../obs/logger.js';
import type { CuePoint } from '../schema/index.js';

const log = moduleLogger('audio');

/**
 * Versioned S3 key for a podcast track (idea/04 §"Podcast"). Shared by every
 * caller (the data-integestion dev-loop adapter and the Area 02 infra glue) so
 * keys are never re-derived. `backend` itself never touches S3.
 */
export function audioKey(caseKey: string, version: number, lang: 'es' | 'en'): string {
  return `audio/${caseKey}/${version}/${lang}.mp3`;
}

export interface AudioItem {
  key: string;
  bytes: Buffer;
  contentType: 'audio/mpeg';
}

const RETRY_DELAYS_MS = [1000, 2000, 4000] as const;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function synthesize(
  apiKey: string,
  voiceId: string,
  script: string,
  /** Logging-only context (private helper — no public contract change). */
  ctx: { caseKey: string; version: number; lang: 'es' | 'en' },
): Promise<Buffer> {
  log(
    `synthesizing case=${ctx.caseKey} version=${ctx.version} ` +
      `lang=${ctx.lang} voiceId=${voiceId} scriptLen=${script.length}chars`,
  );
  let lastErr: unknown;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text: script,
          model_id: 'eleven_multilingual_v2',
        }),
      });
      if (res.status === 429 && attempt < RETRY_DELAYS_MS.length) {
        const delay = RETRY_DELAYS_MS[attempt]!;
        log(
          `rate_limited case=${ctx.caseKey} lang=${ctx.lang} ` +
            `attempt=${attempt + 1} retrying in ${delay}ms`,
        );
        await sleep(delay);
        continue;
      }
      if (!res.ok) {
        const body = await res.text();
        log(
          `ERROR case=${ctx.caseKey} lang=${ctx.lang} ` +
            `status=${res.status} body="${body.slice(0, 120)}"`,
        );
        throw new Error(`ElevenLabs ${res.status}: ${body}`);
      }
      const buf = Buffer.from(await res.arrayBuffer());
      log(
        `done case=${ctx.caseKey} lang=${ctx.lang} bytes=${buf.length} ` +
          `key=${audioKey(ctx.caseKey, ctx.version, ctx.lang)}`,
      );
      return buf;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // HTTP errors from the !res.ok branch are already logged (status/body)
      // just above; only log genuine network-level fetch failures here to
      // avoid double-logging the same error.
      if (!msg.startsWith('ElevenLabs')) {
        log(
          `network_error case=${ctx.caseKey} lang=${ctx.lang} ` +
            `attempt=${attempt + 1} err="${msg.slice(0, 200)}"`,
        );
      }
      lastErr = err;
      if (attempt < RETRY_DELAYS_MS.length) {
        await sleep(RETRY_DELAYS_MS[attempt]!);
        continue;
      }
      throw err;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

/**
 * Pure ElevenLabs synthesis util (idea/04 §"Podcast"). Plain HTTPS `fetch`
 * (no AWS SDK — purity preserved). Returns the two mp3 buffers (es + en)
 * with their versioned S3 keys; the caller owns the S3 write + skip-if-exists.
 * `podcastCuePoints` are a pass-through of the LLM's approximate cue points
 * (tight word-level sync is an explicit non-goal — idea/04).
 */
export async function generateAudio(args: {
  caseKey: string;
  version: number;
  podcast: {
    es: { script: string; cuePoints: CuePoint[] };
    en: { script: string; cuePoints: CuePoint[] };
  };
  voices: { es: string; en: string };
}): Promise<{
  items: AudioItem[];
  podcastCuePoints: { es: CuePoint[]; en: CuePoint[] };
}> {
  const cfg = loadConfig();
  const apiKey = cfg.ELEVENLABS_API_KEY ?? '';
  if (apiKey === '') {
    throw new Error('ELEVENLABS_API_KEY is required for audio generation');
  }

  const esBytes = await synthesize(apiKey, args.voices.es, args.podcast.es.script, {
    caseKey: args.caseKey,
    version: args.version,
    lang: 'es',
  });
  const enBytes = await synthesize(apiKey, args.voices.en, args.podcast.en.script, {
    caseKey: args.caseKey,
    version: args.version,
    lang: 'en',
  });

  const items: AudioItem[] = [
    {
      key: audioKey(args.caseKey, args.version, 'es'),
      bytes: esBytes,
      contentType: 'audio/mpeg',
    },
    {
      key: audioKey(args.caseKey, args.version, 'en'),
      bytes: enBytes,
      contentType: 'audio/mpeg',
    },
  ];

  return {
    items,
    podcastCuePoints: {
      es: args.podcast.es.cuePoints,
      en: args.podcast.en.cuePoints,
    },
  };
}
