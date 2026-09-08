import { Router } from "express";
import { isAuthenticated } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/authorize.middleware";
import actionController from "../controllers/action.controller";

const router = Router();

router.get("/paginated", isAuthenticated, authorize("read_Action"), actionController.getAllAction);
router.get("/:_id", isAuthenticated, authorize("read_Action"), actionController.getActionById);
router.post("/", isAuthenticated, authorize("create_Action"), actionController.addAction);
router.patch("/:_id", isAuthenticated, authorize("update_Action"), actionController.updateAction);
router.delete("/:_id", isAuthenticated, authorize("delete_Action"), actionController.deleteAction);

export default router;
