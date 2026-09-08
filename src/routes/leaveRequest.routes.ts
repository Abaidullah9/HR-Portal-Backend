import { Router } from "express";
import { isAuthenticated } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/authorize.middleware";
import { validateResource } from "../middlewares/validateResource";
import { validateCreateLeaveRequest, validateApproveRejectLeave } from "../utils/helper/constants/validation.utils";
import leaveRequestController from "../controllers/leaveRequest.controller";

const router = Router();

router.get("/paginated", isAuthenticated, authorize("read_LeaveRequest"), leaveRequestController.getAllLeaveRequest);
router.get("/employee/:employeeId", isAuthenticated, authorize("read_LeaveRequest"), leaveRequestController.getLeaveRequestsByEmployee);
router.get("/status/:status", isAuthenticated, authorize("read_LeaveRequest"), leaveRequestController.getLeaveRequestsByStatus);
router.get("/date-range", isAuthenticated, authorize("read_LeaveRequest"), leaveRequestController.getLeaveRequestsByDateRange);
router.get("/:_id", isAuthenticated, authorize("read_LeaveRequest"), leaveRequestController.getLeaveRequestById);
router.post("/", isAuthenticated, authorize("create_LeaveRequest"), validateResource(validateCreateLeaveRequest), leaveRequestController.addLeaveRequest);
router.patch("/:_id/approve-reject", isAuthenticated, authorize("approveReject_LeaveRequest"), validateResource(validateApproveRejectLeave), leaveRequestController.approveRejectLeave);
router.patch("/:_id/cancel", isAuthenticated, authorize("cancel_LeaveRequest"), leaveRequestController.cancelLeaveRequest);
router.patch("/:_id", isAuthenticated, authorize("update_LeaveRequest"), leaveRequestController.updateLeaveRequest);
router.delete("/:_id", isAuthenticated, authorize("delete_LeaveRequest"), leaveRequestController.deleteLeaveRequest);

export default router;
