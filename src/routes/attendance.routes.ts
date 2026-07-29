import { Router } from "express";
import { isAuthenticated } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/authorize.middleware";
import attendanceController from "../controllers/attendance.controller";

const router = Router();

router.get("/employee/:employeeId", attendanceController.getAttendanceByEmployee);
router.get("/date/:date", attendanceController.getAttendanceByDate);
router.get("/range/:employeeId", attendanceController.getAttendanceByDateRange);
router.post("/", isAuthenticated, authorize("Attendance", "create"), attendanceController.addAttendance);
router.get("/:_id", attendanceController.getAttendanceById);
router.patch("/:_id", isAuthenticated, authorize("Attendance", "update"), attendanceController.updateAttendance);
router.delete("/:_id", isAuthenticated, authorize("Attendance", "delete"), attendanceController.deleteAttendance);

export default router;
