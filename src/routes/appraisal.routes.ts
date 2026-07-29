import { Router } from "express";
import { isAuthenticated } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/authorize.middleware";
import appraisalController from "../controllers/appraisal.controller";

const router = Router();

router.get("/", appraisalController.getAllAppraisal);
router.get("/employee/:employeeId", appraisalController.getAppraisalByEmployee);
router.get("/cycle/:cycleId", appraisalController.getAppraisalByCycle);
router.get("/:_id", appraisalController.getAppraisalById);
router.post("/", isAuthenticated, authorize("Appraisal", "create"), appraisalController.addAppraisal);
router.patch("/:_id", isAuthenticated, authorize("Appraisal", "update"), appraisalController.updateAppraisal);
router.patch("/:_id/status", isAuthenticated, authorize("Appraisal", "updateStatus"), appraisalController.updateAppraisalStatus);
router.delete("/:_id", isAuthenticated, authorize("Appraisal", "delete"), appraisalController.deleteAppraisal);

export default router;
