import { Router } from "express";
import { isAuthenticated } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/authorize.middleware";
import departmentController from "../controllers/department.controller";

const router = Router();

router.get("/", departmentController.getAllDepartment);
router.get("/:_id/children", departmentController.getDepartmentChildren);
router.get("/:_id", departmentController.getDepartmentById);
router.post("/", isAuthenticated, authorize("Department", "create"), departmentController.addDepartment);
router.patch("/:_id", isAuthenticated, authorize("Department", "update"), departmentController.updateDepartment);
router.delete("/:_id", isAuthenticated, authorize("Department", "delete"), departmentController.deleteDepartment);

export default router;
