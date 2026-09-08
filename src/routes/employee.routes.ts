import { Router } from "express";
import { isAuthenticated } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/authorize.middleware";
import { validateResource } from "../middlewares/validateResource";
import { validateCreateEmployee } from "../utils/helper/constants/validation.utils";
import employeeController from "../controllers/employee.controller";

const router = Router();

router.get("/paginated", isAuthenticated, authorize("read_Employee"), employeeController.getAllEmployee);
router.get("/active", isAuthenticated, authorize("read_Employee"), employeeController.getActiveEmployees);
router.get("/department/:departmentId", isAuthenticated, authorize("read_Employee"), employeeController.getEmployeesByDepartment);
router.get("/manager/:managerId", isAuthenticated, authorize("read_Employee"), employeeController.getEmployeesByManager);
router.get("/user/:userId", isAuthenticated, authorize("read_Employee"), employeeController.getEmployeeByUserId);
router.get("/:_id", isAuthenticated, authorize("read_Employee"), employeeController.getEmployeeById);
router.post("/", isAuthenticated, authorize("create_Employee"), validateResource(validateCreateEmployee), employeeController.addEmployee);
router.patch("/:_id", isAuthenticated, authorize("update_Employee"), employeeController.updateEmployee);
router.delete("/:_id", isAuthenticated, authorize("delete_Employee"), employeeController.deleteEmployee);

export default router;
