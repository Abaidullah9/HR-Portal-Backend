import { Request, Response, NextFunction } from "express";
import { sendErrorResponse } from "../utils/helper/sendError";

const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  sendErrorResponse(res, err);
};

export default errorHandler;