import { Router } from "express";
import { isAuthenticated } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/authorize.middleware";
import departmentController from "../controllers/department.controller";

const router = Router();

router.get("/paginated", isAuthenticated, authorize("read_Department"), departmentController.getAllDepartment);
router.get("/:_id/children", isAuthenticated, authorize("read_Department"), departmentController.getDepartmentChildren);
router.get("/:_id", isAuthenticated, authorize("read_Department"), departmentController.getDepartmentById);
router.post("/", isAuthenticated, authorize("create_Department"), departmentController.addDepartment);
router.patch("/:_id", isAuthenticated, authorize("update_Department"), departmentController.updateDepartment);
router.delete("/:_id", isAuthenticated, authorize("delete_Department"), departmentController.deleteDepartment);

export default router;
