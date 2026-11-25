/**
 * Backup/restore planning for the compose `mongo` service.
 *
 * The interesting logic — archive naming, retention, which binary runs against
 * which target — lives here as pure functions so it can be tested without a
 * Docker daemon or a MongoDB tools install. The CLIs in src/scripts only print
 * and run what these functions return.
 */

export type Mode = 'docker' | 'local';

export interface BackupOptions {
  mode: Mode;
  compose: string;
  service: string;
  dbName: string;
  uri: string;
  outDir: string;
  keep: number;
  dryRun: boolean;
}

export interface RestoreOptions {
  mode: Mode;
  compose: string;
  service: string;
  dbName: string;
  uri: string;
  archive: string;
  drop: boolean;
  dryRun: boolean;
  /** Restore under a different database name, e.g. a scratch check beside production. */
  into?: string;
}

export interface Step {
  label: string;
  cmd: string;
  args: string[];
}

const DB_NAME = /^[A-Za-z0-9_-]+$/;

export const slug = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** `HR-DB` at 2026-11-25T09:12:03.123Z -> `hr-db-2026-11-25T09-12-03-123Z.archive.gz`. */
export const archiveFileName = (dbName: string, at: Date = new Date()): string =>
  `${slug(dbName)}-${at.toISOString().replace(/[:.]/g, '-')}.archive.gz`;

export const isArchiveName = (name: string): boolean => name.endsWith('.archive.gz');

/** Newest first, and only the archives beyond `keep` are returned. */
export const staleArchives = (names: string[], keep: number): string[] => {
  if (!Number.isInteger(keep) || keep < 1) {
    throw new Error('--keep must be a whole number of archives to retain, at least 1');
  }
  return names
    .filter(isArchiveName)
    .sort()
    .reverse()
    .slice(keep);
};

/** A truncated dump is worse than no dump: refuse anything that is not gzip data. */
export const looksLikeGzip = (file: Buffer): boolean => file.length > 2 && file[0] === 0x1f && file[1] === 0x8b;

/**
 * Catches the obvious mistakes — an empty file, or something that is not a
 * mongodump archive at all. Truncation in the middle is left to mongorestore,
 * which fails loudly on a corrupt stream; a size heuristic here would reject
 * legitimately tiny dumps of an almost-empty database.
 */
export const assertRestorableArchive = (file: Buffer | undefined): void => {
  if (!file || file.length === 0) throw new Error('archive is empty');
  if (!looksLikeGzip(file)) throw new Error('archive is not gzip data (truncated or not a mongodump --gzip archive)');
};

export const assertDbName = (dbName: string): void => {
  if (!DB_NAME.test(dbName)) throw new Error(`--db must be a plain database name, got "${dbName}"`);
};

export const defaultUri = (dbName: string): string => `mongodb://localhost:27017/${dbName}`;

export const composeArgs = (compose: string, service: string): string[] => [
  'compose',
  '-f',
  compose,
  'exec',
  '-T',
  service,
];

export const backupSteps = (options: BackupOptions, archivePath: string): Step[] => {
  assertDbName(options.dbName);
  if (options.mode === 'local') {
    return [
      {
        label: `dump ${options.dbName} with the local mongodump`,
        cmd: 'mongodump',
        args: [`--uri=${options.uri}`, `--archive=${archivePath}`, '--gzip'],
      },
    ];
  }

  const tmp = `/tmp/${archivePath.split(/[\\/]/).pop() ?? 'backup.archive.gz'}`;
  return [
    {
      label: `dump ${options.dbName} inside the ${options.service} container`,
      cmd: 'docker',
      args: [
        ...composeArgs(options.compose, options.service),
        'mongodump',
        `--uri=mongodb://localhost:27017/${options.dbName}`,
        `--archive=${tmp}`,
        '--gzip',
      ],
    },
    {
      label: 'copy the archive out of the container',
      cmd: 'docker',
      args: [
        'compose',
        '-f',
        options.compose,
        'cp',
        `${options.service}:${tmp}`,
        archivePath,
      ],
    },
    {
      label: 'remove the temporary archive from the container',
      cmd: 'docker',
      args: [...composeArgs(options.compose, options.service), 'rm', '-f', tmp],
    },
  ];
};

export const restoreSteps = (options: RestoreOptions): Step[] => {
  assertDbName(options.dbName);
  const into = options.into ?? options.dbName;
  assertDbName(into);
  const drop = options.drop ? ['--drop'] : [];
  const rename = into === options.dbName ? [] : [`--nsFrom=${options.dbName}.*`, `--nsTo=${into}.*`];

  if (options.mode === 'local') {
    return [
      {
        label: `restore ${options.archive} with the local mongorestore`,
        cmd: 'mongorestore',
        args: [`--uri=${options.uri}`, `--archive=${options.archive}`, '--gzip', ...rename, ...drop],
      },
    ];
  }

  const tmp = `/tmp/${options.archive.split(/[\\/]/).pop() ?? 'restore.archive.gz'}`;
  return [
    {
      label: 'copy the archive into the container',
      cmd: 'docker',
      args: ['compose', '-f', options.compose, 'cp', options.archive, `${options.service}:${tmp}`],
    },
    {
      label: `restore into ${into}`,
      cmd: 'docker',
      args: [
        ...composeArgs(options.compose, options.service),
        'mongorestore',
        `--uri=mongodb://localhost:27017/${into}`,
        `--archive=${tmp}`,
        '--gzip',
        ...rename,
        ...drop,
      ],
    },
    {
      label: 'remove the temporary archive from the container',
      cmd: 'docker',
      args: [...composeArgs(options.compose, options.service), 'rm', '-f', tmp],
    },
  ];
};

/** Collects `--flag value`, `--flag=value`, booleans and positional arguments. */
export const parseFlags = (argv: string[], booleans: string[] = []): { flags: Map<string, string>; rest: string[] } => {
  const flags = new Map<string, string>();
  const rest: string[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index] ?? '';
    if (!token.startsWith('--')) {
      rest.push(token);
      continue;
    }
    const [name = '', inline] = token.slice(2).split('=', 2);
    if (inline !== undefined) {
      flags.set(name, inline);
      continue;
    }
    if (booleans.includes(name)) {
      flags.set(name, 'true');
      continue;
    }
    const value = argv[index + 1];
    if (value === undefined || value.startsWith('--')) throw new Error(`--${name} needs a value`);
    flags.set(name, value);
    index += 1;
  }
  return { flags, rest };
};

export const resolveCompose = (
  explicit: string | undefined,
  cwd: string,
  exists: (path: string) => boolean,
  join: (...parts: string[]) => string,
): string => {
  const candidates = explicit
    ? [explicit]
    : [join(cwd, 'docker-compose.yml'), join(cwd, '..', 'docker-compose.yml')];
  const found = candidates.find(exists);
  if (!found) {
    throw new Error('No docker-compose.yml found. Pass --compose <path> or run with --mode local.');
  }
  return found;
};
