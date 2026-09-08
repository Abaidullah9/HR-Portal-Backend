import { Request, Response, NextFunction } from "express";
import { StatusCode } from "../utils/helper/constants/enum";
import { MESSAGES } from "../utils/helper/constants/messages";

export const validateResource = (validationFn: (body: any) => string | null) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const error = validationFn(req.body);
    if (error) {
      return res.status(StatusCode.BAD_REQUEST).json({
        success: false,
        message: `${MESSAGES.VALIDATION_ERROR}: ${error}`,
        data: null,
      });
    }
    next();
  };
};
