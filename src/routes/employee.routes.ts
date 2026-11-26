import { Router } from "express";
import { isAuthenticated } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/authorize.middleware";
import { validateResource } from "../middlewares/validateResource";
import { validateCreateEmployee } from "../utils/helper/constants/validation.utils";
import employeeController from "../controllers/employee.controller";

const router = Router();

router.get("/paginated", isAuthenticated, authorize("read_Employee"), employeeController.getAllEmployee);
router.get("/org-chart", isAuthenticated, authorize("read_Employee"), employeeController.orgChart);
// Self-service profile: scoped to the caller's own employee record inside the
// controller, on the action every role holds for exactly this.
router.get("/me/profile", isAuthenticated, authorize("read_OwnProfile"), employeeController.getOwnProfile);
// Bulk import creates invited users plus employee records, one row at a time.
router.post("/import", isAuthenticated, authorize("create_Employee"), employeeController.importEmployees);
router.get("/active", isAuthenticated, authorize("read_Employee"), employeeController.getActiveEmployees);
router.get("/department/:departmentId", isAuthenticated, authorize("read_Employee"), employeeController.getEmployeesByDepartment);
router.get("/manager/:managerId", isAuthenticated, authorize("read_Employee"), employeeController.getEmployeesByManager);
router.get("/user/:userId", isAuthenticated, authorize("read_Employee"), employeeController.getEmployeeByUserId);
router.get("/:_id/profile", isAuthenticated, authorize("read_Employee"), employeeController.getEmployeeProfile);
router.get("/:_id/export", isAuthenticated, authorize("read_Employee"), employeeController.exportEmployeeData);
router.post("/:_id/rehire", isAuthenticated, authorize("update_Employee"), employeeController.rehireEmployee);
router.post("/:_id/anonymize", isAuthenticated, authorize("delete_Employee"), employeeController.anonymizeEmployee);
router.get("/:_id", isAuthenticated, authorize("read_Employee"), employeeController.getEmployeeById);
router.post("/", isAuthenticated, authorize("create_Employee"), validateResource(validateCreateEmployee), employeeController.addEmployee);
router.patch("/:_id", isAuthenticated, authorize("update_Employee"), employeeController.updateEmployee);
router.delete("/:_id", isAuthenticated, authorize("delete_Employee"), employeeController.deleteEmployee);

export default router;
