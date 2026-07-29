import { Router } from "express";
import { isAuthenticated } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/authorize.middleware";
import performanceCycleController from "../controllers/performanceCycle.controller";

const router = Router();

router.get("/", performanceCycleController.getAllPerformanceCycle);
router.get("/active", performanceCycleController.getActivePerformanceCycle);
router.get("/upcoming", performanceCycleController.getUpcomingPerformanceCycles);
router.get("/:_id", performanceCycleController.getPerformanceCycleById);
router.post("/", isAuthenticated, authorize("PerformanceCycle", "create"), performanceCycleController.addPerformanceCycle);
router.patch("/:_id", isAuthenticated, authorize("PerformanceCycle", "update"), performanceCycleController.updatePerformanceCycle);
router.patch("/:_id/status", isAuthenticated, authorize("PerformanceCycle", "updateStatus"), performanceCycleController.updatePerformanceCycleStatus);
router.delete("/:_id", isAuthenticated, authorize("PerformanceCycle", "delete"), performanceCycleController.deletePerformanceCycle);

export default router;
