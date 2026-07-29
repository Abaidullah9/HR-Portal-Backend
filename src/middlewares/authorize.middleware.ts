import { Request, Response, NextFunction } from "express";
import Role from "../models/role.model";
import { AppError } from "../utils/helper/AppError";

/**
 * Authorization middleware that checks if the authenticated user's role
 * has a specific action permission for a given module.
 *
 * Usage:
 *   router.get("/", isAuthenticated, authorize("Employee", "view"), controller.getAll);
 */
export const authorize = (module: string, action: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      if (!user) {
        throw new AppError("Not authenticated", 401);
      }

      const role = await Role.findById(user.roleId).populate("actions");
      if (!role) {
        throw new AppError("Role not found", 403);
      }

      const actions = role.actions as any[];
      const hasPermission = actions.some(
        (actionDoc: any) => actionDoc.module === module && actionDoc.actionName === action
      );

      if (!hasPermission) {
        throw new AppError(`Not authorized: ${module}.${action}`, 403);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
