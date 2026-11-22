import { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { runWithContext } from '../utils/context';

/**
 * Gives every request an id (honouring an upstream one) and runs the rest of the
 * chain inside an async context, which is what carries the tenant through
 * service calls without threading a parameter through every function.
 */
export const requestContext = (req: Request, res: Response, next: NextFunction) => {
  const header = req.headers['x-request-id'];
  const requestId = (Array.isArray(header) ? header[0] : header) || randomUUID();
  res.setHeader('X-Request-Id', requestId);

  runWithContext({ requestId }, () => {
    next();
  });
};
