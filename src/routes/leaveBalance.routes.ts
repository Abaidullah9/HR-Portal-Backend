import { Router } from "express";
import { isAuthenticated } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/authorize.middleware";
import leaveBalanceController from "../controllers/leaveBalance.controller";

const router = Router();

router.get("/paginated", isAuthenticated, authorize("read_LeaveBalance"), leaveBalanceController.getAllLeaveBalance);
router.get("/employee/:employeeId", isAuthenticated, authorize("read_LeaveBalance"), leaveBalanceController.getLeaveBalancesByEmployee);
router.get("/employee/:employeeId/type/:leaveType/year/:year", isAuthenticated, authorize("read_LeaveBalance"), leaveBalanceController.getLeaveBalanceByEmployeeAndType);
router.get("/year/:year", isAuthenticated, authorize("read_LeaveBalance"), leaveBalanceController.getAllLeaveBalanceByYear);
router.post("/", isAuthenticated, authorize("create_LeaveBalance"), leaveBalanceController.addLeaveBalance);
router.post("/deduct", isAuthenticated, authorize("deduct_LeaveBalance"), leaveBalanceController.deductLeaveBalance);
router.post("/accrue", isAuthenticated, authorize("update_LeaveBalance"), leaveBalanceController.accrueLeaveBalances);
router.get("/:_id", isAuthenticated, authorize("read_LeaveBalance"), leaveBalanceController.getLeaveBalanceById);
router.patch("/:_id", isAuthenticated, authorize("update_LeaveBalance"), leaveBalanceController.updateLeaveBalance);
router.delete("/:_id", isAuthenticated, authorize("delete_LeaveBalance"), leaveBalanceController.deleteLeaveBalance);

export default router;
