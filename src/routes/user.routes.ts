import { Router } from "express";
import rateLimit from "express-rate-limit";
import { isAuthenticated } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/authorize.middleware";
import { validateResource } from "../middlewares/validateResource";
import { validateCreateUser } from "../utils/constants/validation.utils";
import userController from "../controllers/user.controller";

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: "Too many login attempts, please try again after 15 minutes" },
});

const router = Router();

router.post("/register", validateResource(validateCreateUser), userController.registerUser);
router.post("/login", loginLimiter, userController.loginUser);
router.get("/", isAuthenticated, userController.getAllUser);
router.get("/:_id", isAuthenticated, userController.getUserById);
router.patch("/:_id", isAuthenticated, authorize("User", "update"), userController.updateUser);
router.patch("/:_id/status", isAuthenticated, authorize("User", "updateStatus"), userController.updateStatus);
router.patch("/:_id/role", isAuthenticated, authorize("User", "updateRole"), userController.updateRole);
router.delete("/:_id", isAuthenticated, authorize("User", "delete"), userController.deleteUser);

export default router;
