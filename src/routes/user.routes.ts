import { Router } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { isAuthenticated } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/authorize.middleware";
import { validateResource } from "../middlewares/validateResource";
import { validateCreateUser } from "../utils/helper/constants/validation.utils";
import { MESSAGES } from "../utils/helper/constants/messages";
import { StatusCode } from "../utils/helper/constants/enum";
import userController from "../controllers/user.controller";

// Only failed sign-ins count, and they are counted per account as well as per
// address. Keying on the IP alone meant five mistyped passwords anywhere behind
// an office NAT locked out every colleague; keying on the account keeps that
// protection without making the portal unusable from a shared network.
const loginLimit = Number(process.env.LOGIN_RATE_LIMIT_MAX || 20);
const loginLimiter = rateLimit({
  windowMs: Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MINUTES || 15) * 60 * 1000,
  max: Number.isFinite(loginLimit) && loginLimit > 0 ? loginLimit : 20,
  skipSuccessfulRequests: true,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  statusCode: StatusCode.TOO_MANY_REQUESTS,
  message: { success: false, message: MESSAGES.LOGIN_ATTEMPTS_EXCEEDED },
  keyGenerator: (req) => {
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    return `${ipKeyGenerator(req.ip ?? "")}:${email}`;
  },
});

const router = Router();

router.post("/register", validateResource(validateCreateUser), userController.registerUser);
router.post("/login", loginLimiter, userController.loginUser);
router.post("/accept-invite", loginLimiter, userController.acceptInvite);
router.post("/forgot-password", loginLimiter, userController.forgotPassword);
router.post("/change-password", isAuthenticated, userController.changePassword);
router.post("/reset-password", loginLimiter, userController.resetPassword);
router.post("/logout", userController.logoutUser);
router.get("/me", isAuthenticated, userController.getMe);
router.post("/invite", isAuthenticated, authorize("update_User"), userController.inviteUser);
router.get("/paginated", isAuthenticated, authorize("read_User"), userController.getAllUser);
router.get("/:_id", isAuthenticated, authorize("read_User"), userController.getUserById);
router.patch("/:_id/status", isAuthenticated, authorize("updateStatus_User"), userController.updateStatus);
router.patch("/:_id/role", isAuthenticated, authorize("updateRole_User"), userController.updateRole);
router.patch("/:_id", isAuthenticated, authorize("update_User"), userController.updateUser);
router.delete("/:_id", isAuthenticated, authorize("delete_User"), userController.deleteUser);

export default router;
