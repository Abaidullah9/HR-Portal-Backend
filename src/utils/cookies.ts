/**
 * Session cookie options.
 *
 * Locally the frontend and API share `localhost`, so a lax cookie is enough. A
 * deployed app usually serves the UI and the API from different hostnames, where
 * a lax cookie is not sent at all — the session then silently disappears after
 * login. `COOKIE_SAME_SITE` and `COOKIE_SECURE` make that a deployment choice
 * instead of a code change; `none` forces `Secure`, as browsers require.
 */
type SameSite = 'lax' | 'strict' | 'none';

const sameSite = (): SameSite => {
  const configured = (process.env.COOKIE_SAME_SITE || '').toLowerCase();
  if (configured === 'lax' || configured === 'strict' || configured === 'none') {
    return configured;
  }
  return process.env.NODE_ENV === 'production' ? 'none' : 'lax';
};

/** Session lifetime, defaulting to a working week. */
const sessionMaxAge = (): number => {
  const days = Number(process.env.SESSION_DAYS || 7);
  return (Number.isFinite(days) && days > 0 ? days : 7) * 24 * 60 * 60 * 1000;
};

export const sessionCookieOptions = () => {
  const site = sameSite();
  const secure =
    process.env.COOKIE_SECURE !== undefined
      ? process.env.COOKIE_SECURE !== 'false'
      : site === 'none' || process.env.NODE_ENV === 'production';

  return {
    httpOnly: true,
    secure,
    sameSite: site,
    path: '/',
    maxAge: sessionMaxAge(),
  } as const;
};
