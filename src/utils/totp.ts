import crypto from 'crypto';

/**
 * RFC 6238 time-based one-time passwords (SHA-1, 6 digits, 30-second step).
 *
 * Implemented directly on node's crypto so the portal does not take a dependency
 * for ~60 lines. `verifyTotp` accepts one step either side of now, which covers
 * clock drift between the server and the authenticator app.
 */
const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const DIGITS = 6;
const STEP_SECONDS = 30;

const base32Encode = (buffer: Buffer): string => {
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32[(value << (5 - bits)) & 31];
  return output;
};

const base32Decode = (secret: string): Buffer => {
  const clean = secret.replace(/[\s=]/g, '').toUpperCase();
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of clean) {
    const index = BASE32.indexOf(char);
    if (index === -1) continue;
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
};

const constantTimeEquals = (left: string, right: string): boolean => {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

/** The code for one counter (HOTP). Exported for the test vectors. */
export const hotp = (secret: string, counter: number): string => {
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));
  const digest = crypto.createHmac('sha1', base32Decode(secret)).update(message).digest();
  const offset = digest[digest.length - 1]! & 0x0f;
  const binary =
    ((digest[offset]! & 0x7f) << 24) |
    (digest[offset + 1]! << 16) |
    (digest[offset + 2]! << 8) |
    digest[offset + 3]!;
  return String(binary % 10 ** DIGITS).padStart(DIGITS, '0');
};

export const generateSecret = (bytes = 20): string => base32Encode(crypto.randomBytes(bytes));

export const generateTotp = (secret: string, atMs: number = Date.now()): string =>
  hotp(secret, Math.floor(atMs / 1000 / STEP_SECONDS));

export const verifyTotp = (secret: string, code: string, atMs: number = Date.now()): boolean => {
  const normalized = String(code ?? '').replace(/\s/g, '');
  if (!new RegExp(`^\\d{${DIGITS}}$`).test(normalized)) return false;

  const counter = Math.floor(atMs / 1000 / STEP_SECONDS);
  for (const drift of [-1, 0, 1]) {
    if (constantTimeEquals(hotp(secret, counter + drift), normalized)) return true;
  }
  return false;
};

/** The otpauth:// URI an authenticator app imports (shown as text or a QR code). */
export const otpauthUrl = (secret: string, account: string, issuer = 'HR Portal'): string =>
  `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}` +
  `?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${DIGITS}&period=${STEP_SECONDS}`;
