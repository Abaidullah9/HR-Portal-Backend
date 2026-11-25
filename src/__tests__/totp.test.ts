import { generateTotp, hotp, otpauthUrl, verifyTotp } from '../utils/totp';

/** RFC 6238's SHA-1 seed, base32-encoded: ASCII "12345678901234567890". */
const RFC_SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

describe('TOTP', () => {
  it('matches the RFC 6238 vectors for six digits', () => {
    // The RFC publishes eight-digit codes; the six-digit form is the truncation
    // authenticator apps use.
    expect(hotp(RFC_SECRET, Math.floor(59 / 30))).toBe('287082');
    expect(hotp(RFC_SECRET, Math.floor(1111111109 / 30))).toBe('081804');
    expect(hotp(RFC_SECRET, Math.floor(1234567890 / 30))).toBe('005924');
  });

  it('accepts a code from the previous or next step for clock drift', () => {
    const now = 1_111_111_110_000;
    const previous = generateTotp(RFC_SECRET, now - 30_000);
    const current = generateTotp(RFC_SECRET, now);
    const next = generateTotp(RFC_SECRET, now + 30_000);

    expect(verifyTotp(RFC_SECRET, previous, now)).toBe(true);
    expect(verifyTotp(RFC_SECRET, current, now)).toBe(true);
    expect(verifyTotp(RFC_SECRET, next, now)).toBe(true);
  });

  it('rejects a code two steps out, a wrong code, and junk', () => {
    const now = 1_111_111_110_000;

    expect(verifyTotp(RFC_SECRET, generateTotp(RFC_SECRET, now - 90_000), now)).toBe(false);
    expect(verifyTotp(RFC_SECRET, '000000', now)).toBe(false);
    expect(verifyTotp(RFC_SECRET, 'abcdef', now)).toBe(false);
    expect(verifyTotp(RFC_SECRET, '', now)).toBe(false);
  });

  it('builds an otpauth URI an authenticator app can import', () => {
    const url = otpauthUrl('ABCDEF', 'hr@techcorp.com');
    expect(url).toMatch(/^otpauth:\/\/totp\/HR%20Portal:hr%40techcorp\.com\?/);
    expect(url).toContain('secret=ABCDEF');
    expect(url).toContain('digits=6');
  });
});
