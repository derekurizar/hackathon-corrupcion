import { parseArgs } from 'node:util';
import {
  ingestMonth,
  buildBenchmarks,
  runDetection,
  rankAndCluster,
  generateStory,
  generateAudio,
  publish,
  ensureIndexesStage,
  getMongoClient,
  closeMongo,
} from 'backend';

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
  console.log('  ingest       Ingest a month of Guatecompras data (→ ingestMonth)');
  console.log('  benchmarks   Compute benchmarks (→ buildBenchmarks)');
  console.log('  detect       Run detection rules (→ runDetection)');
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
    },
  });

  const cmd = positionals[0] as Command | undefined;

  if (values.help || !cmd) {
    printHelp();
    process.exit(0);
  }

  if (!COMMANDS.includes(cmd)) {
    console.error(`Unknown command: ${cmd}`);
    printHelp();
    process.exit(1);
  }

  try {
    switch (cmd) {
      case 'ingest':
        await ingestMonth();
        break;
      case 'benchmarks':
        await buildBenchmarks();
        break;
      case 'detect':
        await runDetection();
        break;
      case 'generate':
        await rankAndCluster();
        await generateStory();
        await generateAudio();
        await publish();
        break;
      case 'publish':
        await publish();
        break;
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
      console.log(`[${cmd}] Stage not yet implemented — Area 04/05/07`);
      process.exit(0);
    }
    console.error(err instanceof Error ? err.message : String(err));
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
