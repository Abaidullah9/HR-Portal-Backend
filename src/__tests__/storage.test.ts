import fs from 'fs';
import os from 'os';
import path from 'path';

const sendMock = jest.fn().mockResolvedValue({});
const signedUrlMock = jest.fn().mockResolvedValue('https://storage.example/signed');

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn(() => ({ send: sendMock })),
  PutObjectCommand: jest.fn((input: unknown) => ({ kind: 'put', input })),
  DeleteObjectCommand: jest.fn((input: unknown) => ({ kind: 'delete', input })),
  GetObjectCommand: jest.fn((input: unknown) => ({ kind: 'get', input })),
}));
jest.mock('@aws-sdk/s3-request-presigner', () => ({ getSignedUrl: signedUrlMock }));
jest.mock('../utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import {
  removeStoredFile,
  resolveStoredFile,
  saveBuffer,
  signedDownloadUrl,
  usesObjectStorage,
} from '../utils/storage';

const env = {
  uploadDir: process.env.UPLOAD_DIR,
  bucket: process.env.S3_BUCKET,
};

const restoreEnv = () => {
  if (env.uploadDir === undefined) delete process.env.UPLOAD_DIR;
  else process.env.UPLOAD_DIR = env.uploadDir;
  if (env.bucket === undefined) delete process.env.S3_BUCKET;
  else process.env.S3_BUCKET = env.bucket;
};

describe('document storage', () => {
  let tempDir: string;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.S3_BUCKET;
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-storage-'));
    process.env.UPLOAD_DIR = tempDir;
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    restoreEnv();
  });

  it('uses the local driver when no bucket is configured', async () => {
    expect(usesObjectStorage()).toBe(false);
    const key = await saveBuffer('abc-123.pdf', Buffer.from('contract'));
    expect(key).toBe('abc-123.pdf');
    expect(fs.readFileSync(path.join(tempDir, 'abc-123.pdf'), 'utf8')).toBe('contract');
    expect(resolveStoredFile('abc-123.pdf')).toBe(path.join(tempDir, 'abc-123.pdf'));
  });

  it('reduces a key to its filename so uploads cannot escape the root', async () => {
    const key = await saveBuffer('../../etc/passwd', Buffer.from('x'));
    expect(key).toBe('passwd');
    expect(fs.existsSync(path.join(tempDir, 'passwd'))).toBe(true);
    expect(resolveStoredFile('../../../etc/passwd')).toBe(path.join(tempDir, 'passwd'));
  });

  it('deletes a stored file and tolerates a missing one', async () => {
    await saveBuffer('gone.txt', Buffer.from('x'));
    await removeStoredFile('gone.txt');
    expect(fs.existsSync(path.join(tempDir, 'gone.txt'))).toBe(false);
    await expect(removeStoredFile('never-existed.txt')).resolves.toBeUndefined();
  });

  it('has no signed URL for local storage', async () => {
    await expect(signedDownloadUrl('abc.pdf')).resolves.toBeNull();
    expect(resolveStoredFile('abc.pdf')).toBeNull();
  });

  it('uploads to object storage when a bucket is configured', async () => {
    process.env.S3_BUCKET = 'hr-documents';
    expect(usesObjectStorage()).toBe(true);

    const key = await saveBuffer('uuid-1.pdf', Buffer.from('remote'));
    expect(key).toBe('uuid-1.pdf');
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock.mock.calls[0][0]).toMatchObject({
      kind: 'put',
      input: expect.objectContaining({ Bucket: 'hr-documents', Key: 'uuid-1.pdf' }),
    });
    // The local driver must not also write the file.
    expect(fs.readdirSync(tempDir)).toEqual([]);
  });

  it('returns a presigned read URL instead of streaming a remote file', async () => {
    process.env.S3_BUCKET = 'hr-documents';
    await expect(signedDownloadUrl('uuid-1.pdf')).resolves.toBe('https://storage.example/signed');
    expect(signedUrlMock).toHaveBeenCalledTimes(1);
    expect(resolveStoredFile('uuid-1.pdf')).toBeNull();
  });

  it('deletes the object rather than a local file', async () => {
    process.env.S3_BUCKET = 'hr-documents';
    await removeStoredFile('uuid-1.pdf');
    expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({ kind: 'delete' }));
  });
});
