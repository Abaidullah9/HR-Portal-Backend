import { Router } from "express";
import { isAuthenticated } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/authorize.middleware";
import roleController from "../controllers/role.controller";

const router = Router();

router.get("/", roleController.getAllRole);
router.get("/:_id", roleController.getRoleById);
router.post("/", isAuthenticated, authorize("Role", "create"), roleController.addRole);
router.patch("/:_id", isAuthenticated, authorize("Role", "update"), roleController.updateRole);
router.patch("/:_id/actions", isAuthenticated, authorize("Role", "assignActions"), roleController.assignActionsToRole);
router.delete("/:_id", isAuthenticated, authorize("Role", "delete"), roleController.deleteRole);

export default router;
