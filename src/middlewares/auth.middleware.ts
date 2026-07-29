import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import userModel from "../models/user.model";
import roleModel from "../models/role.model";

declare global {
  namespace Express {
    export interface Request {
      user?: any;
      userId?: string;
    }
  }
}

export const isAuthenticated = async (req: Request, res: Response, next: NextFunction) => {
  let token = req.cookies?.accessToken;
  if (!token && req.headers.authorization?.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }
  if (!token) {
    res.status(401).json({ success: false, message: "You are not logged in. Please log in to get access." });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as jwt.JwtPayload;
    const currentUser = await userModel.findOne({ _id: decoded.userId, isActive: true });
    if (!currentUser) {
      res.status(401).json({ success: false, message: "The user belonging to this token no longer exists." });
      return;
    }
    req.user = currentUser;
    req.userId = currentUser._id.toString();
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: "Invalid or expired token." });
    return;
  }
};

export const isAdmin = async (req: Request, res: Response, next: NextFunction) => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ success: false, message: "Not authenticated" });
    return;
  }

  try {
    const role = await roleModel.findById(user.roleId);
    if (!role) {
      res.status(403).json({ success: false, message: "Role not found." });
      return;
    }
    if (role.roleName.toLowerCase() !== "admin") {
      res.status(403).json({ success: false, message: "Admin access required." });
      return;
    }
    next();
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error." });
    return;
  }
};

export const attachUser = async (req: Request, res: Response, next: NextFunction) => {
  let token = req.cookies?.accessToken;
  if (!token && req.headers.authorization?.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as jwt.JwtPayload;
      const currentUser = await userModel.findOne({ _id: decoded.userId, isActive: true });
      if (currentUser) {
        req.user = currentUser;
        req.userId = currentUser._id.toString();
      }
    } catch {
      // Silently fail — allow public access
    }
  }
  next();
};
