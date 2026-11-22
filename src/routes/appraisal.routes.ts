import { Router } from "express";
import { isAuthenticated } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/authorize.middleware";
import appraisalController from "../controllers/appraisal.controller";

const router = Router();

router.get("/paginated", isAuthenticated, authorize("read_Appraisal"), appraisalController.getAllAppraisal);
// Registered before "/:_id" so "me" is not parsed as an appraisal id.
router.get("/me", isAuthenticated, authorize("read_LeaveRequest"), appraisalController.getMyAppraisals);
router.get("/employee/:employeeId", isAuthenticated, authorize("read_Appraisal"), appraisalController.getAppraisalByEmployee);
router.get("/cycle/:cycleId", isAuthenticated, authorize("read_Appraisal"), appraisalController.getAppraisalByCycle);
router.get("/:_id", isAuthenticated, authorize("read_Appraisal"), appraisalController.getAppraisalById);
router.post("/", isAuthenticated, authorize("create_Appraisal"), appraisalController.addAppraisal);
router.patch("/:_id/status", isAuthenticated, authorize("update_AppraisalStatus"), appraisalController.updateAppraisalStatus);
// Self review is the employee's own write, so it is authorised on the action
// every role holds; the service restricts it to the appraisal's owner.
router.patch("/:_id/self-review", isAuthenticated, authorize("read_LeaveRequest"), appraisalController.submitSelfReview);
router.patch("/:_id/manager-review", isAuthenticated, authorize("update_Appraisal"), appraisalController.submitManagerReview);
router.patch("/:_id/calibrate", isAuthenticated, authorize("update_AppraisalStatus"), appraisalController.calibrate);
router.patch("/:_id/lock", isAuthenticated, authorize("update_AppraisalStatus"), appraisalController.lock);
router.patch("/:_id", isAuthenticated, authorize("update_Appraisal"), appraisalController.updateAppraisal);
router.delete("/:_id", isAuthenticated, authorize("delete_Appraisal"), appraisalController.deleteAppraisal);

export default router;
