import {
  archiveFileName,
  assertRestorableArchive,
  backupSteps,
  looksLikeGzip,
  parseFlags,
  resolveCompose,
  restoreSteps,
  staleArchives,
  type BackupOptions,
  type RestoreOptions,
} from '../utils/mongoArchive';

const at = new Date('2026-11-25T09:12:03.123Z');

const backup = (over: Partial<BackupOptions> = {}): BackupOptions => ({
  mode: 'docker',
  compose: 'D:/Humify/docker-compose.yml',
  service: 'mongo',
  dbName: 'HR-DB',
  uri: 'mongodb://localhost:27017/HR-DB',
  outDir: 'D:/Humify/HR Portal Backend/backups',
  keep: 14,
  dryRun: false,
  ...over,
});

const restore = (over: Partial<RestoreOptions> = {}): RestoreOptions => ({
  mode: 'docker',
  compose: 'D:/Humify/docker-compose.yml',
  service: 'mongo',
  dbName: 'HR-DB',
  uri: 'mongodb://localhost:27017/HR-DB',
  archive: 'D:/Humify/HR Portal Backend/backups/hr-db-2026-11-25T09-12-03-123Z.archive.gz',
  drop: true,
  dryRun: false,
  ...over,
});

describe('archive naming', () => {
  it('makes a sortable, safe file name from the database and time', () => {
    expect(archiveFileName('HR-DB', at)).toBe('hr-db-2026-11-25T09-12-03-123Z.archive.gz');
  });

  it('strips anything that is not filename-safe', () => {
    expect(archiveFileName('HR DB/../prod', at)).toBe('hr-db-prod-2026-11-25T09-12-03-123Z.archive.gz');
  });
});

describe('retention', () => {
  const names = [
    'hr-db-2026-11-01T00-00-00-000Z.archive.gz',
    'hr-db-2026-11-03T00-00-00-000Z.archive.gz',
    'hr-db-2026-11-02T00-00-00-000Z.archive.gz',
    'notes.txt',
  ];

  it('keeps the newest archives and prunes the rest', () => {
    expect(staleArchives(names, 2)).toEqual(['hr-db-2026-11-01T00-00-00-000Z.archive.gz']);
  });

  it('never deletes while nothing is over the limit', () => {
    expect(staleArchives(names, 5)).toEqual([]);
  });

  it('rejects a retention of zero, which would delete the backup just taken', () => {
    expect(() => staleArchives(names, 0)).toThrow(/at least 1/);
  });
});

describe('archive validation', () => {
  const gzipHead = Buffer.from([0x1f, 0x8b, 0x08, 0x00]);
  const dump = Buffer.concat([gzipHead, Buffer.alloc(256, 0x2a)]);

  it('accepts gzip data', () => {
    expect(looksLikeGzip(gzipHead)).toBe(true);
    expect(() => assertRestorableArchive(dump)).not.toThrow();
  });

  it('refuses an empty file and a file that is not gzip', () => {
    expect(() => assertRestorableArchive(Buffer.alloc(0))).toThrow(/empty/);
    expect(() => assertRestorableArchive(undefined)).toThrow(/empty/);
    expect(() => assertRestorableArchive(Buffer.from('not gzip at all'))).toThrow(/not gzip/);
  });
});

describe('backup plan', () => {
  it('dumps inside the compose container, copies the archive out and cleans up', () => {
    const steps = backupSteps(backup(), '/host/out/hr-db.archive.gz.partial');

    expect(steps.map((step) => step.cmd)).toEqual(['docker', 'docker', 'docker']);
    expect(steps[0]!.args).toEqual([
      'compose', '-f', 'D:/Humify/docker-compose.yml', 'exec', '-T', 'mongo',
      'mongodump',
      '--uri=mongodb://localhost:27017/HR-DB',
      '--archive=/tmp/hr-db.archive.gz.partial',
      '--gzip',
    ]);
    expect(steps[1]!.args).toEqual([
      'compose', '-f', 'D:/Humify/docker-compose.yml', 'cp',
      'mongo:/tmp/hr-db.archive.gz.partial',
      '/host/out/hr-db.archive.gz.partial',
    ]);
    expect(steps[2]!.args).toContain('rm');
  });

  it('uses the local mongodump when there is no Docker', () => {
    const steps = backupSteps(backup({ mode: 'local' }), '/host/out/hr-db.archive.gz.partial');
    expect(steps).toHaveLength(1);
    expect(steps[0]!.cmd).toBe('mongodump');
    expect(steps[0]!.args).toEqual([
      '--uri=mongodb://localhost:27017/HR-DB',
      '--archive=/host/out/hr-db.archive.gz.partial',
      '--gzip',
    ]);
  });

  it('refuses a database name that could escape into a path', () => {
    expect(() => backupSteps(backup({ dbName: '../HR-DB' }), '/tmp/x.partial')).toThrow(/plain database name/);
  });
});

describe('restore plan', () => {
  it('copies the archive in and replaces the collections', () => {
    const steps = restoreSteps(restore());
    expect(steps.map((step) => step.cmd)).toEqual(['docker', 'docker', 'docker']);
    expect(steps[1]!.args).toEqual([
      'compose', '-f', 'D:/Humify/docker-compose.yml', 'exec', '-T', 'mongo',
      'mongorestore',
      '--uri=mongodb://localhost:27017/HR-DB',
      '--archive=/tmp/hr-db-2026-11-25T09-12-03-123Z.archive.gz',
      '--gzip',
      '--drop',
    ]);
  });

  it('omits --drop when merging was asked for', () => {
    const steps = restoreSteps(restore({ drop: false }));
    expect(steps[1]!.args).not.toContain('--drop');
    expect(steps[1]!.args).toContain('--gzip');
  });

  it('restores under another database name for a drill', () => {
    const steps = restoreSteps(restore({ into: 'HR-DB-restore-check' }));
    expect(steps[1]!.args).toContain('--nsFrom=HR-DB.*');
    expect(steps[1]!.args).toContain('--nsTo=HR-DB-restore-check.*');
    expect(steps[1]!.args).toContain('--drop');
  });

  it('does not rename when restoring in place', () => {
    const steps = restoreSteps(restore());
    expect(steps[1]!.args.some((arg) => arg.startsWith('--ns'))).toBe(false);
  });

  it('restores from a host path in local mode', () => {
    const steps = restoreSteps(restore({ mode: 'local' }));
    expect(steps[0]!.cmd).toBe('mongorestore');
    expect(steps[0]!.args).toContain('--archive=D:/Humify/HR Portal Backend/backups/hr-db-2026-11-25T09-12-03-123Z.archive.gz');
    expect(steps[0]!.args).toContain('--drop');
  });
});

describe('flags', () => {
  it('reads values, inline values and booleans', () => {
    const { flags, rest } = parseFlags(
      ['--db', 'HR-DB', '--keep=30', '--yes', 'positional'],
      ['yes'],
    );
    expect(flags.get('db')).toBe('HR-DB');
    expect(flags.get('keep')).toBe('30');
    expect(flags.get('yes')).toBe('true');
    expect(rest).toEqual(['positional']);
  });

  it('rejects a flag whose value is missing', () => {
    expect(() => parseFlags(['--db'])).toThrow(/needs a value/);
  });
});

describe('compose discovery', () => {
  const join = (...parts: string[]) => parts.join('/');

  it('prefers the working directory, then the parent, for this repository layout', () => {
    expect(resolveCompose(undefined, '/repo/HR Portal Backend', (p) => p.endsWith('/docker-compose.yml') && p.includes('..'), join))
      .toBe('/repo/HR Portal Backend/../docker-compose.yml');
  });

  it('explains what to do when no compose file exists', () => {
    expect(() => resolveCompose(undefined, '/repo', () => false, join)).toThrow(/--compose/);
  });
});
