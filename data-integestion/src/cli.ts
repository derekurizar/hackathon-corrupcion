import { parseArgs } from 'node:util';
import {
  ingestMonth,
  buildBenchmarks,
  runDetection,
  ensureIndexesStage,
  getMongoClient,
  closeMongo,
  moduleLogger,
} from 'backend';

const log = moduleLogger('cli');

const COMMANDS = [
  'ingest',
  'benchmarks',
  'detect',
  'generate',
  'publish',
  'ensure-indexes',
  'ping',
] as const;
type Command = (typeof COMMANDS)[number];

function printHelp() {
  console.log('Usage: pnpm cli <command> [options]');
  console.log('');
  console.log('Commands:');
  console.log(
    '  ingest       Ingest a month of Guatecompras data (→ ingestMonth)',
  );
  console.log(
    '                 --year <Y> --month <M> [--dry-run] [--spike]',
  );
  console.log('  benchmarks   Compute benchmarks (→ buildBenchmarks)');
  console.log('                 [--scope scope:YYYY-MM..YYYY-MM] [--dry-run]');
  console.log('  detect       Run detection rules (→ runDetection)');
  console.log('                 [--scope scope:YYYY-MM..YYYY-MM] [--dry-run]');
  console.log('  generate     Full generation chain: rank → story → audio → publish');
  console.log('  publish      Publish investigations (→ publish)');
  console.log(
    '  ensure-indexes  Create/verify all MongoDB Atlas indexes (idempotent)',
  );
  console.log('  ping         Smoke test: connect to MongoDB Atlas and print ok');
}

async function main() {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    args: process.argv.slice(2),
    options: {
      help: { type: 'boolean', short: 'h', default: false },
      year: { type: 'string' },
      month: { type: 'string' },
      scope: { type: 'string' },
      'dry-run': { type: 'boolean', default: false },
      spike: { type: 'boolean', default: false },
    },
  });

  const cmd = positionals[0] as Command | undefined;

  if (values.help || !cmd) {
    printHelp();
    process.exit(0);
  }

  if (!COMMANDS.includes(cmd)) {
    log(`Unknown command: ${cmd}`);
    printHelp();
    process.exit(1);
  }

  try {
    switch (cmd) {
      case 'ingest': {
        if (values['spike'] === true) {
          const yr = Number.parseInt(values['year'] ?? '', 10);
          const mo = Number.parseInt(values['month'] ?? '', 10);
          if (Number.isNaN(yr) || Number.isNaN(mo)) {
            log('ingest --spike requires --year <Y> and --month <M>');
            process.exit(1);
          }
          const { runSpike } = await import('../scripts/spike-zip.js');
          await runSpike(yr, mo);
          break;
        }
        const year = Number.parseInt(values['year'] ?? '', 10);
        const month = Number.parseInt(values['month'] ?? '', 10);
        if (Number.isNaN(year) || Number.isNaN(month)) {
          log('ingest requires --year <Y> and --month <M>');
          process.exit(1);
        }
        const result = await ingestMonth({
          year,
          month,
          dryRun: values['dry-run'] === true,
        });
        log(
          `[ingest] ${year}-${month} → ${result.recordsIngested} records ingested` +
            (result.runId ? ` (run ${result.runId})` : ' (dry-run, no DB writes)'),
        );
        break;
      }
      case 'benchmarks': {
        const scope = values['scope'];
        const result = await buildBenchmarks({
          ...(scope !== undefined ? { scope } : {}),
          dryRun: values['dry-run'] === true,
        });
        log(
          `[benchmarks] ${result.scope} → ${result.releases} releases, ${result.entities} entities` +
            (result.runId ? ` (run ${result.runId})` : ' (dry-run, no DB writes)'),
        );
        break;
      }
      case 'detect': {
        const scope = values['scope'];
        const result = await runDetection({
          ...(scope !== undefined ? { scope } : {}),
          dryRun: values['dry-run'] === true,
        });
        log(
          `[detect] ${result.scope} → ${result.signals} signals over ${result.releases} releases` +
            (result.runId ? ` (run ${result.runId})` : ' (dry-run, no DB writes)'),
        );
        break;
      }
      case 'generate': {
        const { generate } = await import('backend');
        const { persistAudio } = await import('./s3-audio-adapter.js');
        const genScope = values['scope'];
        const result = await generate({
          ...(genScope !== undefined ? { scope: genScope } : {}),
        });
        if (result.audioItems && result.audioItems.length > 0) {
          const bucket = process.env['AUDIO_BUCKET'] ?? '';
          if (bucket) {
            const audioResult = await persistAudio(result.audioItems, bucket);
            log(
              `[generate] audio uploaded=${audioResult.uploaded} skipped=${audioResult.skipped}`,
            );
          } else {
            log(
              '[generate] AUDIO_BUCKET not set — skipping S3 upload',
            );
          }
        }
        log(
          `[generate] done cases=${result.cases} investigations=${result.investigations} skipped=${result.skipped}`,
        );
        break;
      }
      case 'publish': {
        const { rankAndCluster, publish } = await import('backend');
        const rankScope = values['scope'];
        const ranked = await rankAndCluster({
          ...(rankScope !== undefined ? { scope: rankScope } : {}),
        });
        const result = await publish({
          runId: `run-${new Date().toISOString()}`,
          scope: ranked.scope,
          bundles: ranked.bundles,
        });
        log(
          `[publish] investigations=${result.investigations} skipped=${result.skipped} edition=${result.editionId}`,
        );
        break;
      }
      case 'ensure-indexes':
        await ensureIndexesStage();
        break;
      case 'ping': {
        const client = await getMongoClient();
        await client.db().admin().command({ ping: 1 });
        await closeMongo();
        console.log('ok');
        break;
      }
    }
  } catch (err) {
    if (cmd !== 'ping' && err instanceof Error && err.message.startsWith('not implemented')) {
      log(`[${cmd}] Stage not yet implemented — Area 04/05/07`);
      process.exit(0);
    }
    log(err instanceof Error ? err.message : String(err));
    process.exit(1);
  } finally {
    // Ensure the Mongo client is closed so the process exits cleanly.
    // ping manages its own lifecycle (calls closeMongo inside the case).
    // All other commands need this cleanup.
    if (cmd !== 'ping') {
      await closeMongo().catch(() => {
        /* ignore close errors */
      });
    }
  }
}

main();
