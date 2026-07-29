import { Request, Response, NextFunction } from "express";
import { StatusCode } from "../utils/helper/constants/enum";

/**
 * Middleware factory that validates request body against a validation function.
 * The validation function should return an error message string or null.
 */
export const validateResource = (validationFn: (body: any) => string | null) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const error = validationFn(req.body);
    if (error) {
      return res.status(StatusCode.BAD_REQUEST).json({
        success: false,
        message: `Validation Error: ${error}`,
        data: null,
      });
    }
    next();
  };
};
