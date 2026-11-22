import { Request, Response, NextFunction } from "express";
import { sendErrorResponse } from "../utils/helper/sendError";
import { logger } from "../utils/logger";

const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  // The request id is attached, so a 500 in the logs can be matched to the
  // response the user saw.
  logger.error('request.failed', {
    method: req.method,
    path: req.originalUrl,
    message: err?.message,
    stack: err?.stack?.split('\n').slice(0, 4).join(' | '),
  });
  sendErrorResponse(res, err);
};

export default errorHandler;