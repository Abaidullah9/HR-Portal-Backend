#!/usr/bin/env node
import { spawnSync } from 'child_process';
import { existsSync, mkdirSync, readdirSync, renameSync, rmSync, statSync } from 'fs';
import { join, resolve } from 'path';
import {
  archiveFileName,
  backupSteps,
  defaultUri,
  parseFlags,
  resolveCompose,
  staleArchives,
  type BackupOptions,
  type Mode,
  type Step,
} from '../utils/mongoArchive';

const help = `Usage: npm run db:backup -- [options]

Dump the portal database to backups/ as a gzipped mongodump archive.

  --mode docker|local   Transport to use (default: docker when available)
  --compose <path>      docker-compose.yml (default: ./docker-compose.yml or ../docker-compose.yml)
  --service <name>      Compose service running Mongo (default: mongo)
  --db <name>           Database to dump (default: $MONGO_DB or HR-DB)
  --uri <uri>           Connection string for --mode local (default: $MONGO_URI)
  --out <dir>           Where archives are written (default: ./backups)
  --keep <n>            Archives to retain, older ones are deleted (default: 14)
  --dry-run             Print the commands without running them
`;

const dockerAvailable = (): boolean => spawnSync('docker', ['--version'], { stdio: 'ignore' }).status === 0;

const run = (step: Step): void => {
  console.log(`  $ ${[step.cmd, ...step.args].join(' ')}`);
  const result = spawnSync(step.cmd, step.args, { stdio: 'inherit' });
  if (result.error) throw new Error(`${step.label}: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`${step.label} failed with exit code ${result.status}`);
};

const main = (): void => {
  const argv = process.argv.slice(2);
  if (argv.includes('--help')) {
    console.log(help);
    return;
  }

  const { flags } = parseFlags(argv, ['dry-run', 'help']);
  const dbName = flags.get('db') ?? process.env.MONGO_DB ?? 'HR-DB';
  const cwd = process.cwd();
  const requested = flags.get('mode');
  if (requested && requested !== 'docker' && requested !== 'local') {
    throw new Error('--mode must be docker or local');
  }

  let mode: Mode;
  let compose = '';
  if (requested === 'local') {
    mode = 'local';
  } else {
    const found = dockerAvailable() ? resolveCompose(flags.get('compose'), cwd, existsSync, join) : '';
    if (found || requested === 'docker') {
      mode = 'docker';
      compose = resolveCompose(flags.get('compose'), cwd, existsSync, join);
    } else {
      console.log('Docker is not available; falling back to the local mongodump.');
      mode = 'local';
    }
  }

  const outDir = resolve(cwd, flags.get('out') ?? 'backups');
  const keep = Number(flags.get('keep') ?? 14);
  const dryRun = flags.get('dry-run') === 'true';

  const options: BackupOptions = {
    mode,
    compose,
    service: flags.get('service') ?? 'mongo',
    dbName,
    uri: flags.get('uri') ?? process.env.MONGO_URI ?? defaultUri(dbName),
    outDir,
    keep,
    dryRun,
  };

  const finalPath = join(outDir, archiveFileName(dbName));
  const partialPath = `${finalPath}.partial`;

  console.log(`Backing up ${dbName} (${mode}) to ${finalPath}`);
  const steps = backupSteps(options, partialPath);

  if (dryRun) {
    console.log('\nDry run, nothing executed:');
    for (const step of steps) console.log(`  $ ${[step.cmd, ...step.args].join(' ')}`);
    return;
  }

  mkdirSync(outDir, { recursive: true });
  try {
    for (const step of steps) run(step);
    renameSync(partialPath, finalPath);
  } catch (error) {
    // A half-written archive must never look like a usable backup.
    if (existsSync(partialPath)) rmSync(partialPath, { force: true });
    throw error;
  }

  const size = statSync(finalPath).size;
  console.log(`\nBackup written: ${finalPath} (${(size / 1024).toFixed(1)} KiB)`);

  const stale = staleArchives(readdirSync(outDir), keep);
  for (const name of stale) {
    rmSync(join(outDir, name), { force: true });
    console.log(`Pruned old archive: ${name}`);
  }
  const kept = Math.min(readdirSync(outDir).filter((name) => name.endsWith('.archive.gz')).length, keep);
  console.log(`Archives retained: ${kept} of ${keep}`);
};

try {
  main();
} catch (error) {
  console.error(`\nBackup failed: ${(error as Error).message}`);
  process.exitCode = 1;
}
