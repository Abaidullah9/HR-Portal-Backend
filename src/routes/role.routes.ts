import { Router } from "express";
import { isAuthenticated } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/authorize.middleware";
import roleController from "../controllers/role.controller";

const router = Router();

router.get("/paginated", isAuthenticated, authorize("read_Role"), roleController.getAllRole);
router.get("/:_id", isAuthenticated, authorize("read_Role"), roleController.getRoleById);
router.post("/", isAuthenticated, authorize("create_Role"), roleController.addRole);
router.patch("/:_id/actions", isAuthenticated, authorize("assignActions_Role"), roleController.assignActionsToRole);
router.patch("/:_id", isAuthenticated, authorize("update_Role"), roleController.updateRole);
router.delete("/:_id", isAuthenticated, authorize("delete_Role"), roleController.deleteRole);

export default router;
