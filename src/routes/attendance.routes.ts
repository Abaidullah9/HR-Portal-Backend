import { Router } from "express";
import { isAuthenticated } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/authorize.middleware";
import attendanceController from "../controllers/attendance.controller";

const router = Router();

router.get("/paginated", isAuthenticated, authorize("read_Attendance"), attendanceController.getAllAttendance);
router.get("/employee/:employeeId", isAuthenticated, authorize("read_Attendance"), attendanceController.getAttendanceByEmployee);
router.get("/date/:date", isAuthenticated, authorize("read_Attendance"), attendanceController.getAttendanceByDate);
router.get("/range/:employeeId", isAuthenticated, authorize("read_Attendance"), attendanceController.getAttendanceByDateRange);
router.post("/", isAuthenticated, authorize("create_Attendance"), attendanceController.addAttendance);
router.get("/:_id", isAuthenticated, authorize("read_Attendance"), attendanceController.getAttendanceById);
router.patch("/:_id", isAuthenticated, authorize("update_Attendance"), attendanceController.updateAttendance);
router.delete("/:_id", isAuthenticated, authorize("delete_Attendance"), attendanceController.deleteAttendance);

export default router;
