import { Router } from "express";
import { isAuthenticated } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/authorize.middleware";
import { validateResource } from "../middlewares/validateResource";
import { validateCreateLeaveRequest, validateApproveRejectLeave } from "../utils/constants/validation.utils";
import leaveRequestController from "../controllers/leaveRequest.controller";

const router = Router();

router.get("/employee/:employeeId", leaveRequestController.getLeaveRequestsByEmployee);
router.get("/status/:status", leaveRequestController.getLeaveRequestsByStatus);
router.get("/date-range", leaveRequestController.getLeaveRequestsByDateRange);
router.get("/:_id", leaveRequestController.getLeaveRequestById);
router.post("/", isAuthenticated, authorize("LeaveRequest", "create"), validateResource(validateCreateLeaveRequest), leaveRequestController.addLeaveRequest);
router.patch("/:_id", isAuthenticated, authorize("LeaveRequest", "update"), leaveRequestController.updateLeaveRequest);
router.patch("/:_id/approve-reject", isAuthenticated, authorize("LeaveRequest", "approveReject"), validateResource(validateApproveRejectLeave), leaveRequestController.approveRejectLeave);
router.patch("/:_id/cancel", isAuthenticated, authorize("LeaveRequest", "cancel"), leaveRequestController.cancelLeaveRequest);
router.delete("/:_id", isAuthenticated, authorize("LeaveRequest", "delete"), leaveRequestController.deleteLeaveRequest);

export default router;
