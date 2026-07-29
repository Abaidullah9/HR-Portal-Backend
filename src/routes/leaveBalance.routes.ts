import { Router } from "express";
import { isAuthenticated } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/authorize.middleware";
import leaveBalanceController from "../controllers/leaveBalance.controller";

const router = Router();

router.get("/employee/:employeeId", leaveBalanceController.getLeaveBalancesByEmployee);
router.get("/employee/:employeeId/type/:leaveType/year/:year", leaveBalanceController.getLeaveBalanceByEmployeeAndType);
router.get("/year/:year", leaveBalanceController.getAllLeaveBalanceByYear);
router.post("/", isAuthenticated, authorize("LeaveBalance", "create"), leaveBalanceController.addLeaveBalance);
router.post("/deduct", isAuthenticated, authorize("LeaveBalance", "deduct"), leaveBalanceController.deductLeaveBalance);
router.get("/:_id", leaveBalanceController.getLeaveBalanceById);
router.patch("/:_id", isAuthenticated, authorize("LeaveBalance", "update"), leaveBalanceController.updateLeaveBalance);
router.delete("/:_id", isAuthenticated, authorize("LeaveBalance", "delete"), leaveBalanceController.deleteLeaveBalance);

export default router;
