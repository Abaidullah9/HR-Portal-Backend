import { Router } from "express";
import { isAuthenticated } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/authorize.middleware";
import actionController from "../controllers/action.controller";

const router = Router();

router.get("/", actionController.getAllAction);
router.get("/module/:module", actionController.getActionByModule);
router.get("/:_id", actionController.getActionById);
router.post("/", isAuthenticated, authorize("Actions", "create"), actionController.addAction);
router.patch("/:_id", isAuthenticated, authorize("Actions", "update"), actionController.updateAction);
router.delete("/:_id", isAuthenticated, authorize("Actions", "delete"), actionController.deleteAction);

export default router;
