import { Router } from "express";
import { isAuthenticated } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/authorize.middleware";
import reportController from "../controllers/report.controller";

const router = Router();

router.get("/paginated", isAuthenticated, authorize("read_Report"), reportController.getAllReport);
router.get("/category/:category", isAuthenticated, authorize("read_Report"), reportController.getReportByCategory);
router.get("/:_id", isAuthenticated, authorize("read_Report"), reportController.getReportById);
router.post("/", isAuthenticated, authorize("create_Report"), reportController.addReport);
router.patch("/:_id", isAuthenticated, authorize("update_Report"), reportController.updateReport);
router.delete("/:_id", isAuthenticated, authorize("delete_Report"), reportController.deleteReport);

export default router;
