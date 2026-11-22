import fs from 'fs';
import path from 'path';
import { logger } from './logger';

/**
 * Document storage.
 *
 * Files are written under `UPLOAD_DIR` (default `./uploads`) with random names
 * and are only ever served through an authenticated controller — never by a
 * static mount. `DOCUMENT_STORAGE_URL` switches the recorded path to an external
 * bucket/CDN prefix while keeping the same read path for downloaded files; the
 * local driver remains the default so the app runs with no extra services.
 */
const uploadRoot = () => path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads'));

export const ensureUploadRoot = (): string => {
  const root = uploadRoot();
  if (!fs.existsSync(root)) fs.mkdirSync(root, { recursive: true });
  return root;
};

/** Stores a buffer and returns its opaque storage key. */
export const saveBuffer = async (key: string, buffer: Buffer): Promise<string> => {
  const root = ensureUploadRoot();
  const target = path.join(root, path.basename(key));
  await fs.promises.writeFile(target, buffer);
  return path.basename(key);
};

/** Absolute path for a storage key, refusing anything that escapes the root. */
export const resolveStoredFile = (key: string): string | null => {
  const root = ensureUploadRoot();
  const target = path.resolve(root, path.basename(key));
  if (!target.startsWith(root)) return null;
  return fs.existsSync(target) ? target : null;
};

export const removeStoredFile = async (key: string): Promise<void> => {
  const target = resolveStoredFile(key);
  if (!target) return;
  try {
    await fs.promises.unlink(target);
  } catch (error) {
    logger.warn('storage.unlink-failed', { key, error: (error as Error)?.message });
  }
};

/** Public-facing URL recorded on the document, if an external store is used. */
export const storageUrlFor = (key: string): string => {
  const base = process.env.DOCUMENT_STORAGE_URL;
  if (!base) return `/api/v1/documents/${key}/file`;
  return `${base.replace(/\/$/, '')}/${key}`;
};
