import { Router } from "express";
import actionRoutes from "./action.routes";
import appraisalRoutes from "./appraisal.routes";
import attendanceRoutes from "./attendance.routes";
import candidateRoutes from "./candidate.routes";
import departmentRoutes from "./department.routes";
import documentRoutes from "./document.routes";
import employeeRoutes from "./employee.routes";
import employeePayrollRoutes from "./employeePayroll.routes";
import feedbackRoutes from "./feedback.routes";
import interviewRoutes from "./interview.routes";
import jobPostingRoutes from "./jobPosting.routes";
import leaveBalanceRoutes from "./leaveBalance.routes";
import leaveRequestRoutes from "./leaveRequest.routes";
import organizationSettingRoutes from "./organizationSetting.routes";
import performanceCycleRoutes from "./performanceCycle.routes";
import reportRoutes from "./report.routes";
import roleRoutes from "./role.routes";
import teamRoutes from "./team.routes";
import userRoutes from "./user.routes";

const router = Router();

router.get("/", (_req, res) => {
  res.json({ success: true, message: "HR Portal API v1 - Working" });
});

router.use("/actions", actionRoutes);
router.use("/appraisals", appraisalRoutes);
router.use("/attendance", attendanceRoutes);
router.use("/candidates", candidateRoutes);
router.use("/departments", departmentRoutes);
router.use("/documents", documentRoutes);
router.use("/employees", employeeRoutes);
router.use("/payroll", employeePayrollRoutes);
router.use("/feedback", feedbackRoutes);
router.use("/interviews", interviewRoutes);
router.use("/job-postings", jobPostingRoutes);
router.use("/leave-balances", leaveBalanceRoutes);
router.use("/leave-requests", leaveRequestRoutes);
router.use("/organization-settings", organizationSettingRoutes);
router.use("/performance-cycles", performanceCycleRoutes);
router.use("/reports", reportRoutes);
router.use("/roles", roleRoutes);
router.use("/teams", teamRoutes);
router.use("/users", userRoutes);

export default router;
