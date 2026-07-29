import { Router } from "express";
import { isAuthenticated } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/authorize.middleware";
import reportController from "../controllers/report.controller";

const router = Router();

router.get("/", reportController.getAllReport);
router.get("/category/:category", reportController.getReportByCategory);
router.get("/:_id", reportController.getReportById);
router.post("/", isAuthenticated, authorize("Report", "create"), reportController.addReport);
router.patch("/:_id", isAuthenticated, authorize("Report", "update"), reportController.updateReport);
router.delete("/:_id", isAuthenticated, authorize("Report", "delete"), reportController.deleteReport);

export default router;
