import fs from 'fs';
import path from 'path';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { logger } from './logger';

/**
 * Document storage.
 *
 * Two drivers behind one interface:
 *
 * - `local` (default) writes under `UPLOAD_DIR` and serves files through the
 *   authenticated download controller. Fine for development and a single
 *   long-lived server.
 * - `s3` (enabled by `S3_BUCKET`) writes to S3-compatible object storage and
 *   hands the client a short-lived signed URL. This is what makes uploads
 *   survive a redeploy, a container restart or a second instance — a local disk
 *   has none of those properties on a hosted platform.
 *
 * Keys are always reduced to a bare filename so a crafted upload name cannot
 * escape the storage prefix.
 */
export const usesObjectStorage = (): boolean => Boolean(process.env.S3_BUCKET);

const uploadRoot = (): string => {
  const root = path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads'));
  if (!fs.existsSync(root)) fs.mkdirSync(root, { recursive: true });
  return root;
};

const storageKeyOf = (key: string): string => path.basename(key);

let cachedClient: S3Client | null = null;

const s3Client = (): S3Client => {
  if (cachedClient) return cachedClient;

  const endpoint = process.env.S3_ENDPOINT;
  cachedClient = new S3Client({
    region: process.env.S3_REGION || 'us-east-1',
    ...(endpoint ? { endpoint } : {}),
    ...(process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY
      ? {
          credentials: {
            accessKeyId: process.env.S3_ACCESS_KEY_ID,
            secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
          },
        }
      : {}),
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
  });
  return cachedClient;
};

const bucket = (): string => {
  const name = process.env.S3_BUCKET;
  if (!name) throw new Error('S3_BUCKET is not configured');
  return name;
};

/** Stores a buffer and returns its opaque storage key. */
export const saveBuffer = async (key: string, buffer: Buffer): Promise<string> => {
  const name = storageKeyOf(key);

  if (usesObjectStorage()) {
    await s3Client().send(
      new PutObjectCommand({
        Bucket: bucket(),
        Key: name,
        Body: buffer,
      }),
    );
    return name;
  }

  await fs.promises.writeFile(path.join(uploadRoot(), name), buffer);
  return name;
};

/** Absolute path for a storage key, or null when there is no local file. */
export const resolveStoredFile = (key: string): string | null => {
  if (usesObjectStorage()) return null;
  const target = path.join(uploadRoot(), storageKeyOf(key));
  return fs.existsSync(target) ? target : null;
};

export const removeStoredFile = async (key: string): Promise<void> => {
  if (!key) return;

  try {
    if (usesObjectStorage()) {
      await s3Client().send(
        new DeleteObjectCommand({ Bucket: bucket(), Key: storageKeyOf(key) }),
      );
      return;
    }

    const target = resolveStoredFile(key);
    if (!target) return;
    await fs.promises.unlink(target);
  } catch (error) {
    logger.warn('storage.delete-failed', { key, error: (error as Error)?.message });
  }
};

/**
 * A temporary read URL for a stored document. Only object storage can issue
 * one; the local driver has no public URL and must be streamed by the
 * authenticated controller instead.
 */
export const signedDownloadUrl = async (key: string): Promise<string | null> => {
  if (!usesObjectStorage()) return null;

  const configured = Number(process.env.DOWNLOAD_URL_TTL_SECONDS);
  const expiresIn = Number.isFinite(configured) && configured > 0 ? configured : 300;

  return getSignedUrl(
    s3Client(),
    new GetObjectCommand({ Bucket: bucket(), Key: storageKeyOf(key) }),
    { expiresIn },
  );
};
