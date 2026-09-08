import { Router } from "express";
import { isAuthenticated } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/authorize.middleware";
import appraisalController from "../controllers/appraisal.controller";

const router = Router();

router.get("/paginated", isAuthenticated, authorize("read_Appraisal"), appraisalController.getAllAppraisal);
router.get("/employee/:employeeId", isAuthenticated, authorize("read_Appraisal"), appraisalController.getAppraisalByEmployee);
router.get("/cycle/:cycleId", isAuthenticated, authorize("read_Appraisal"), appraisalController.getAppraisalByCycle);
router.get("/:_id", isAuthenticated, authorize("read_Appraisal"), appraisalController.getAppraisalById);
router.post("/", isAuthenticated, authorize("create_Appraisal"), appraisalController.addAppraisal);
router.patch("/:_id/status", isAuthenticated, authorize("update_AppraisalStatus"), appraisalController.updateAppraisalStatus);
router.patch("/:_id", isAuthenticated, authorize("update_Appraisal"), appraisalController.updateAppraisal);
router.delete("/:_id", isAuthenticated, authorize("delete_Appraisal"), appraisalController.deleteAppraisal);

export default router;
