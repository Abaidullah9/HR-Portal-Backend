import { Router } from "express";
import { isAuthenticated } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/authorize.middleware";
import employeePayrollController from "../controllers/employeePayroll.controller";

const router = Router();

router.get("/paginated", isAuthenticated, authorize("read_Payroll"), employeePayrollController.getAllPayroll);
// Self-service payslips: the employee comes from the session, and every seeded
// role holds read_LeaveRequest, which keeps this off an HR-only grant.
router.get("/me", isAuthenticated, authorize("read_LeaveRequest"), employeePayrollController.getOwnPayslips);
router.get("/:_id/payslip", isAuthenticated, authorize("read_Payroll"), employeePayrollController.getPayslip);
router.get("/employee/:employeeId", isAuthenticated, authorize("read_Payroll"), employeePayrollController.getPayrollByEmployee);
router.get("/pay-period", isAuthenticated, authorize("read_Payroll"), employeePayrollController.getPayrollByPayPeriod);
router.get("/status/:status", isAuthenticated, authorize("read_Payroll"), employeePayrollController.getPayrollByStatus);
router.get("/:_id", isAuthenticated, authorize("read_Payroll"), employeePayrollController.getPayrollById);
router.post("/", isAuthenticated, authorize("create_Payroll"), employeePayrollController.addPayroll);
router.patch("/:_id/status", isAuthenticated, authorize("update_PayrollStatus"), employeePayrollController.updatePayrollStatus);
router.patch("/:_id", isAuthenticated, authorize("update_Payroll"), employeePayrollController.updatePayroll);
router.delete("/:_id", isAuthenticated, authorize("delete_Payroll"), employeePayrollController.deletePayroll);

export default router;
