import { Router } from 'express';
import hrInsightsController from '../controllers/hrInsights.controller';
import { isAuthenticated } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';

const router = Router();

// Dashboard cards: each group is returned only if the role may read that module.
router.get(
  '/dashboard/summary',
  isAuthenticated,
  hrInsightsController.dashboardSummary,
);

// Summaries: totals for the page cards, authorised as the page itself.
router.get(
  '/attendance/summary',
  isAuthenticated,
  authorize('read_Attendance'),
  hrInsightsController.attendanceSummary,
);
router.get(
  '/payroll/summary',
  isAuthenticated,
  authorize('read_Payroll'),
  hrInsightsController.payrollSummary,
);

// Who is working today: attendance, approved leave and holidays resolved together.
router.get(
  '/workforce/today',
  isAuthenticated,
  authorize('read_Attendance'),
  hrInsightsController.workforceToday,
);

// Approved absence for the caller's team, for the leave calendar.
router.get(
  '/leave-requests/team-calendar',
  isAuthenticated,
  authorize('read_LeaveRequest'),
  hrInsightsController.teamCalendar,
);

// Payroll period generation.
router.post(
  '/payroll/generate',
  isAuthenticated,
  authorize('create_Payroll'),
  hrInsightsController.generatePayroll,
);

// Self-service: each handler derives the employee from the session, so the
// caller can only ever reach their own records. Each route names its own
// self-service action rather than borrowing another module's read grant.
router.get(
  '/leave-balances/me',
  isAuthenticated,
  authorize('read_OwnLeaveBalance'),
  hrInsightsController.ownBalances,
);
router.get(
  '/attendance/me',
  isAuthenticated,
  authorize('read_OwnAttendance'),
  hrInsightsController.ownAttendance,
);
router.get(
  '/appraisals/me',
  isAuthenticated,
  authorize('read_OwnAppraisal'),
  hrInsightsController.ownAppraisals,
);
router.get(
  '/employees/me',
  isAuthenticated,
  authorize('read_OwnProfile'),
  hrInsightsController.ownEmployee,
);

// Workforce analytics for the reports page.
router.get(
  '/analytics/summary',
  isAuthenticated,
  authorize('read_Report'),
  hrInsightsController.analyticsSummary,
);

// Audit trail viewer — Admin holds read_Role.
router.get(
  '/audit-logs',
  isAuthenticated,
  authorize('read_Role'),
  hrInsightsController.listAuditLogs,
);

export default router;
