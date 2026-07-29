import { Router } from "express";
import { isAuthenticated } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/authorize.middleware";
import { validateResource } from "../middlewares/validateResource";
import { validateCreateEmployee } from "../utils/constants/validation.utils";
import employeeController from "../controllers/employee.controller";

const router = Router();

router.get("/", employeeController.getAllEmployee);
router.get("/active", employeeController.getActiveEmployees);
router.get("/department/:departmentId", employeeController.getEmployeesByDepartment);
router.get("/manager/:managerId", employeeController.getEmployeesByManager);
router.get("/user/:userId", employeeController.getEmployeeByUserId);
router.get("/:_id", employeeController.getEmployeeById);
router.post("/", isAuthenticated, authorize("Employee", "create"), validateResource(validateCreateEmployee), employeeController.addEmployee);
router.patch("/:_id", isAuthenticated, authorize("Employee", "update"), employeeController.updateEmployee);
router.delete("/:_id", isAuthenticated, authorize("Employee", "delete"), employeeController.deleteEmployee);

export default router;
