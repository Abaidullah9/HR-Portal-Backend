#!/usr/bin/env node
import { spawnSync } from 'child_process';
import { closeSync, existsSync, openSync, readdirSync, readSync } from 'fs';
import { join, resolve } from 'path';
import {
  assertRestorableArchive,
  defaultUri,
  isArchiveName,
  parseFlags,
  resolveCompose,
  restoreSteps,
  type Mode,
  type RestoreOptions,
  type Step,
} from '../utils/mongoArchive';

const help = `Usage: npm run db:restore -- [--archive <file>] --yes [options]

Restore a gzipped mongodump archive written by db:backup.

  --archive <file>      Archive to restore (default: newest in --out)
  --out <dir>           Where archives live (default: ./backups)
  --db <name>           Database inside the archive (default: $MONGO_DB or HR-DB)
  --into <name>         Restore under a different name, e.g. a scratch drill target
  --mode docker|local   Transport to use (default: docker when available)
  --compose <path>      docker-compose.yml (default: ./docker-compose.yml or ../docker-compose.yml)
  --service <name>      Compose service running Mongo (default: mongo)
  --uri <uri>           Connection string for --mode local (default: $MONGO_URI)
  --no-drop             Merge into existing collections instead of replacing them
  --dry-run             Print the commands without running them
  --yes                 Required: confirms the target data may be replaced
`;

const dockerAvailable = (): boolean => spawnSync('docker', ['--version'], { stdio: 'ignore' }).status === 0;

const run = (step: Step): void => {
  console.log(`  $ ${[step.cmd, ...step.args].join(' ')}`);
  const result = spawnSync(step.cmd, step.args, { stdio: 'inherit' });
  if (result.error) throw new Error(`${step.label}: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`${step.label} failed with exit code ${result.status}`);
};

/** Only the first bytes are needed, and a 10 GiB archive should not be read twice. */
const head = (path: string): Buffer => {
  const fd = openSync(path, 'r');
  try {
    const buffer = Buffer.alloc(4);
    const read = readSync(fd, buffer, 0, 4, 0);
    return buffer.subarray(0, read);
  } finally {
    closeSync(fd);
  }
};

const newestArchive = (outDir: string): string => {
  if (!existsSync(outDir)) throw new Error(`No backups directory at ${outDir}. Run npm run db:backup first.`);
  const names = readdirSync(outDir).filter(isArchiveName).sort().reverse();
  const newest = names[0];
  if (!newest) throw new Error(`No .archive.gz files in ${outDir}. Run npm run db:backup first.`);
  return join(outDir, newest);
};

const main = (): void => {
  const argv = process.argv.slice(2);
  if (argv.includes('--help')) {
    console.log(help);
    return;
  }

  const { flags } = parseFlags(argv, ['dry-run', 'help', 'yes', 'no-drop']);
  const dbName = flags.get('db') ?? process.env.MONGO_DB ?? 'HR-DB';
  const cwd = process.cwd();

  const requested = flags.get('mode');
  if (requested && requested !== 'docker' && requested !== 'local') {
    throw new Error('--mode must be docker or local');
  }

  let mode: Mode;
  let compose = '';
  if (requested === 'local' || (!requested && !dockerAvailable())) {
    mode = 'local';
  } else {
    mode = 'docker';
    compose = resolveCompose(flags.get('compose'), cwd, existsSync, join);
  }

  const outDir = resolve(cwd, flags.get('out') ?? 'backups');
  const archive = resolve(cwd, flags.get('archive') ?? newestArchive(outDir));

  assertRestorableArchive(head(archive));

  const options: RestoreOptions = {
    mode,
    compose,
    service: flags.get('service') ?? 'mongo',
    dbName,
    uri: flags.get('uri') ?? process.env.MONGO_URI ?? defaultUri(dbName),
    archive,
    drop: flags.get('no-drop') !== 'true',
    dryRun: flags.get('dry-run') === 'true',
    ...(flags.get('into') ? { into: flags.get('into') as string } : {}),
  };

  const target = options.into ?? dbName;
  console.log(
    `Restoring ${archive}\n  into ${target} (${mode})${target === dbName ? '' : ` from ${dbName}`}${options.drop ? ', replacing existing collections' : ', merging'}`,
  );

  const steps = restoreSteps(options);
  for (const step of steps) console.log(`  $ ${[step.cmd, ...step.args].join(' ')}`);

  if (options.dryRun) return;

  if (flags.get('yes') !== 'true') {
    console.log('\nNothing was changed. Re-run with --yes once you are sure this is the right target.');
    process.exitCode = 2;
    return;
  }

  for (const step of steps) run(step);
  console.log('\nRestore finished. Count the documents before trusting it:');
  console.log(
    `  docker compose exec -T mongo mongosh --quiet --eval "db.getSiblingDB('${target}').getCollectionNames().sort().forEach(c => print(c, db.getSiblingDB('${target}')[c].countDocuments()))"`,
  );
};

try {
  main();
} catch (error) {
  console.error(`\nRestore failed: ${(error as Error).message}`);
  process.exitCode = 1;
}
