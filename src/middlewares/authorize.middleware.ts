import { Request, Response, NextFunction } from "express";
import Role from "../models/role.model";
import "../models/action.model"; 
import { AppError } from "../utils/helper/AppError";
import { MESSAGES } from "../utils/helper/constants/messages";
import { StatusCode } from "../utils/helper/constants/enum";

export const authorize = (action: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      if (!user) {
        throw new AppError(MESSAGES.NOT_AUTHENTICATED, StatusCode.UNAUTHORIZED);
      }

      const role = await Role.findById(user.roleId).populate("actions");
      if (!role) {
        throw new AppError(MESSAGES.ROLE_NOT_FOUND, StatusCode.FORBIDDEN);
      }

      const actions = role.actions as any[];
      const hasPermission = actions.some(
        (actionDoc: any) => actionDoc.actionName === action
      );

      if (!hasPermission) {
        throw new AppError(`${MESSAGES.NOT_AUTHORIZED}: ${action}`, StatusCode.FORBIDDEN);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
