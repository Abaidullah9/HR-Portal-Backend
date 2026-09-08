import { Router } from "express";
import { isAuthenticated } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/authorize.middleware";
import performanceCycleController from "../controllers/performanceCycle.controller";

const router = Router();

router.get("/paginated", isAuthenticated, authorize("read_PerformanceCycle"), performanceCycleController.getAllPerformanceCycle);
router.get("/active", isAuthenticated, authorize("read_PerformanceCycle"), performanceCycleController.getActivePerformanceCycle);
router.get("/upcoming", isAuthenticated, authorize("read_PerformanceCycle"), performanceCycleController.getUpcomingPerformanceCycles);
router.get("/:_id", isAuthenticated, authorize("read_PerformanceCycle"), performanceCycleController.getPerformanceCycleById);
router.post("/", isAuthenticated, authorize("create_PerformanceCycle"), performanceCycleController.addPerformanceCycle);
router.patch("/:_id/status", isAuthenticated, authorize("updateStatus_PerformanceCycle"), performanceCycleController.updatePerformanceCycleStatus);
router.patch("/:_id", isAuthenticated, authorize("update_PerformanceCycle"), performanceCycleController.updatePerformanceCycle);
router.delete("/:_id", isAuthenticated, authorize("delete_PerformanceCycle"), performanceCycleController.deletePerformanceCycle);

export default router;
