import { NextFunction, Request, Response } from 'express';
import { StatusCode } from '../utils/helper/constants/enum';

const UNTRUSTED = 'This request came from an untrusted origin';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Browser origins allowed to call the API; `FRONTEND_URL` may list several. */
export const trustedOrigins = (): string[] =>
  (process.env.FRONTEND_URL || 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);

/**
 * Cross-site request forgery defence for cookie sessions.
 *
 * Authentication rides in an httpOnly cookie, which a browser attaches to
 * requests started by any other site. SameSite covers most of that, but `none`
 * is required when the API lives on its own hostname. So every mutation must
 * also prove where it came from: a browser sends `Origin`, and a mismatch is
 * refused before the handler runs.
 *
 * Without `Origin` the browser's own classification is the remaining signal.
 * Non-browser clients (curl, server-to-server calls, the Postman collection)
 * send neither and carry no ambient cookie, so they reach the regular
 * authentication check instead.
 */
export const requireTrustedOrigin = (req: Request, res: Response, next: NextFunction) => {
  if (SAFE_METHODS.has(req.method)) return next();

  const origin = req.headers.origin?.replace(/\/$/, '');
  const trusted = origin
    ? trustedOrigins().includes(origin)
    : req.headers['sec-fetch-site'] !== 'cross-site';

  if (!trusted) {
    res.status(StatusCode.FORBIDDEN).json({ success: false, message: UNTRUSTED });
    return;
  }

  next();
};
