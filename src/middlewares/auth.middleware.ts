import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import userModel from "../models/user.model";
import roleModel from "../models/role.model";
import { MESSAGES } from "../utils/helper/constants/messages";
import { StatusCode } from "../utils/helper/constants/enum";
import { setContextOrganization, setContextUser } from "../utils/context";

declare global {
  namespace Express {
    export interface Request {
      user?: any;
      userId?: string;
    }
  }
}

/**
 * A token minted before the user's last password change, reset or deactivation
 * no longer matches the session generation stored on the user record.
 */
const isCurrentSession = (decoded: jwt.JwtPayload, user: { tokenVersion?: number }): boolean =>
  (user.tokenVersion ?? 0) === (typeof decoded.tokenVersion === "number" ? decoded.tokenVersion : 0);

export const isAuthenticated = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  let token = req.cookies?.accessToken;
  if (!token && req.headers.authorization?.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }
  if (!token) {
    res
      .status(StatusCode.UNAUTHORIZED)
      .json({
        success: false,
        message: MESSAGES.NOT_LOGGED_IN,
      });
    return;
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET!,
    ) as jwt.JwtPayload;
    const currentUser = await userModel.findOne({
      _id: decoded.userId,
      isActive: true,
    });
    if (!currentUser) {
      res
        .status(StatusCode.UNAUTHORIZED)
        .json({
          success: false,
          message: MESSAGES.USER_NO_LONGER_EXISTS,
        });
      return;
    }
    // The token is only as valid as the session generation it was minted in.
    // Password changes, resets and deactivations bump the counter, so a cookie
    // captured before them stops working immediately instead of at expiry.
    if (!isCurrentSession(decoded, currentUser)) {
      res
        .status(StatusCode.UNAUTHORIZED)
        .json({ success: false, message: MESSAGES.SESSION_REVOKED });
      return;
    }
    req.user = currentUser;
    req.userId = currentUser._id.toString();
    // Tenant scope for every query in this request comes from the user record,
    // never from anything the client sends.
    setContextUser(req.userId);
    setContextOrganization(currentUser.organizationId?.toString());
    next();
  } catch (error) {
    res
      .status(StatusCode.UNAUTHORIZED)
      .json({ success: false, message: MESSAGES.INVALID_OR_EXPIRED_TOKEN });
    return;
  }
};

export const isAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const user = req.user;
  if (!user) {
    res.status(StatusCode.UNAUTHORIZED).json({ success: false, message: MESSAGES.NOT_AUTHENTICATED });
    return;
  }

  try {
    const role = await roleModel.findById(user.roleId);
    if (!role) {
      res.status(StatusCode.FORBIDDEN).json({ success: false, message: MESSAGES.ROLE_NOT_FOUND });
      return;
    }
    if (role.roleName.toLowerCase() !== "admin") {
      res
        .status(StatusCode.FORBIDDEN)
        .json({ success: false, message: MESSAGES.ADMIN_ACCESS_REQUIRED });
      return;
    }
    next();
  } catch (error) {
    res.status(StatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: MESSAGES.INTERNAL_SERVER_ERROR });
    return;
  }
};

export const attachUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  let token = req.cookies?.accessToken;
  if (!token && req.headers.authorization?.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }
  if (token) {
    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET!,
      ) as jwt.JwtPayload;
      const currentUser = await userModel.findOne({
        _id: decoded.userId,
        isActive: true,
      });
      if (currentUser && isCurrentSession(decoded, currentUser)) {
        req.user = currentUser;
        req.userId = currentUser._id.toString();
      }
    } catch {
      // Silently fail — allow public access
    }
  }
  next();
};
