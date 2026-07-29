import { Router } from "express";
import { isAuthenticated } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/authorize.middleware";
import employeePayrollController from "../controllers/employeePayroll.controller";

const router = Router();

router.get("/employee/:employeeId", employeePayrollController.getPayrollByEmployee);
router.get("/pay-period", employeePayrollController.getPayrollByPayPeriod);
router.get("/status/:status", employeePayrollController.getPayrollByStatus);
router.get("/:_id", employeePayrollController.getPayrollById);
router.post("/", isAuthenticated, authorize("Payroll", "create"), employeePayrollController.addPayroll);
router.patch("/:_id", isAuthenticated, authorize("Payroll", "update"), employeePayrollController.updatePayroll);
router.patch("/:_id/status", isAuthenticated, authorize("Payroll", "updateStatus"), employeePayrollController.updatePayrollStatus);
router.delete("/:_id", isAuthenticated, authorize("Payroll", "delete"), employeePayrollController.deletePayroll);

export default router;
