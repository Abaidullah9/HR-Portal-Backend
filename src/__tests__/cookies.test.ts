import { sessionCookieOptions } from '../utils/cookies';

const original = {
  nodeEnv: process.env.NODE_ENV,
  sameSite: process.env.COOKIE_SAME_SITE,
  secure: process.env.COOKIE_SECURE,
  days: process.env.SESSION_DAYS,
};

const restore = () => {
  process.env.NODE_ENV = original.nodeEnv;
  if (original.sameSite === undefined) delete process.env.COOKIE_SAME_SITE;
  else process.env.COOKIE_SAME_SITE = original.sameSite;
  if (original.secure === undefined) delete process.env.COOKIE_SECURE;
  else process.env.COOKIE_SECURE = original.secure;
  if (original.days === undefined) delete process.env.SESSION_DAYS;
  else process.env.SESSION_DAYS = original.days;
};

describe('session cookie options', () => {
  afterEach(restore);

  it('uses a lax, non-secure cookie in development', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.COOKIE_SAME_SITE;
    delete process.env.COOKIE_SECURE;
    expect(sessionCookieOptions()).toMatchObject({ sameSite: 'lax', secure: false, httpOnly: true, path: '/' });
  });

  it('defaults production to a cross-site cookie so a split UI/API keeps its session', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.COOKIE_SAME_SITE;
    delete process.env.COOKIE_SECURE;
    expect(sessionCookieOptions()).toMatchObject({ sameSite: 'none', secure: true });
  });

  it('honours an explicit deployment choice', () => {
    process.env.NODE_ENV = 'production';
    process.env.COOKIE_SAME_SITE = 'strict';
    delete process.env.COOKIE_SECURE;
    // sameSite=none is the only value that forces Secure.
    expect(sessionCookieOptions()).toMatchObject({ sameSite: 'strict', secure: true });
  });

  it('never emits sameSite=none without Secure', () => {
    process.env.NODE_ENV = 'development';
    process.env.COOKIE_SAME_SITE = 'none';
    delete process.env.COOKIE_SECURE;
    expect(sessionCookieOptions().secure).toBe(true);
  });

  it('reads the session lifetime from the environment', () => {
    process.env.SESSION_DAYS = '2';
    expect(sessionCookieOptions().maxAge).toBe(2 * 24 * 60 * 60 * 1000);
    process.env.SESSION_DAYS = 'not-a-number';
    expect(sessionCookieOptions().maxAge).toBe(7 * 24 * 60 * 60 * 1000);
  });
});
