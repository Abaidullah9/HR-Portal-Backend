import { Response } from "express";
import { MESSAGES } from "./constants/messages";
import { StatusCode } from "./constants/enum";

export const sendErrorResponse = (res: Response, error: unknown) => {
  const err = error as { name?: string; code?: number; statusCode?: number; message?: string; stack?: string };
  const isProd = process.env.NODE_ENV === "production";

  console.error(`[ERROR] ${err?.statusCode || StatusCode.INTERNAL_SERVER_ERROR} - ${err?.message || "Unknown error"}`);

  if (err?.name === "CastError") {
    res.status(StatusCode.BAD_REQUEST).json({
      success: false,
      message: MESSAGES.INVALID_ID_FORMAT,
      ...(!isProd && { stack: err.stack }),
    });
    return;
  }

  if (err?.name === "ValidationError") {
    res.status(StatusCode.BAD_REQUEST).json({
      success: false,
      message: err.message || MESSAGES.VALIDATION_FAILED,
      ...(!isProd && { stack: err.stack }),
    });
    return;
  }

  if (err?.code === 11000) {
    res.status(StatusCode.CONFLICT).json({
      success: false,
      message: MESSAGES.DUPLICATE_VALUE,
      ...(!isProd && { stack: err.stack }),
    });
    return;
  }

  const statusCode = err?.statusCode || StatusCode.INTERNAL_SERVER_ERROR;

  res.status(statusCode).json({
    success: false,
    message: err?.message || MESSAGES.INTERNAL_SERVER_ERROR,
    ...(!isProd && { stack: err?.stack }),
  });
};
