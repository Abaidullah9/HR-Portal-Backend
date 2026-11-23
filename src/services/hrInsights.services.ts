import attendanceModel from '../models/attendance.model';
import employeeModel from '../models/employee.model';
import payrollModel from '../models/employeePayroll.model';
import leaveBalanceModel from '../models/leaveBalance.model';
import appraisalModel from '../models/appraisal.model';
import leaveRequestModel from '../models/leaveRequest.model';
import organizationSettingModel from '../models/organizationSetting.model';
import auditLogModel from '../models/auditLog.model';
import userModel from '../models/user.model';
import roleModel from '../models/role.model';
import notificationServices from './notification.services';
import payrollRunServices from './payrollRun.services';
import workforceServices from './workforce.services';
import { dayKey, isDayKey } from '../utils/dates';
import { tenantFilter } from '../utils/context';
import { resolveReadScope } from '../utils/helper/ownership';
import { AppError } from '../utils/helper/AppError';
import { StatusCode } from '../utils/helper/constants/enum';
import { getPagination, paginatedResult, PaginationQuery } from '../utils/common';

const DEFAULT_LATE_AFTER = '09:15';

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const lateThreshold = async () => {
  const settings = await organizationSettingModel.findOne();
  return settings?.lateAfter || DEFAULT_LATE_AFTER;
};

const minutesOf = (value: string) => {
  const [hours = 9, minutes = 15] = value.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * The dashboard's stat cards. Each group is returned only when the caller's role
 * holds the matching read action, so paging the tables cannot change these
 * numbers and no module's totals leak to a role that cannot open it.
 */
const dashboardSummary = async (userId: string) => {
  const user = await userModel.findById(userId);
  const role = user
    ? await roleModel.findById(user.roleId).populate('actions', 'actionName')
    : null;
  const actions = new Set(
    ((role?.actions as { actionName?: string }[] | undefined) ?? [])
      .map((action) => action.actionName)
      .filter((name): name is string => Boolean(name)),
  );

  const scope = await resolveReadScope(userId);
  const today = startOfDay(new Date());
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

  const summary: {
    employees?: { total: number; active: number };
    attendance?: { presentToday: number };
    leaves?: { onLeave: number; pending: number };
  } = {};

  if (actions.has('read_Employee')) {
    const [total, active] = await Promise.all([
      employeeModel.countDocuments(),
      employeeModel.countDocuments({ isActive: true }),
    ]);
    summary.employees = { total, active };
  }

  if (actions.has('read_Attendance')) {
    const filter: Record<string, unknown> = {
      date: { $gte: today, $lt: tomorrow },
      checkIn: { $exists: true },
    };
    if (!scope.canReadAll) filter.employeeId = scope.ownEmployeeId ?? null;
    summary.attendance = { presentToday: await attendanceModel.countDocuments(filter) };
  }

  if (actions.has('read_LeaveRequest')) {
    const base: Record<string, unknown> = {};
    if (!scope.canReadAll) base.employeeId = scope.ownEmployeeId ?? null;
    const [onLeave, pending] = await Promise.all([
      leaveRequestModel.countDocuments({ ...base, leaveStatus: 'approved' }),
      leaveRequestModel.countDocuments({ ...base, leaveStatus: 'pending' }),
    ]);
    summary.leaves = { onLeave, pending };
  }

  return summary;
};

/**
 * Totals for the attendance page. Deferred to the workforce resolver so a
 * holiday or an approved leave is not counted as an absence.
 */
const attendanceSummary = async (dateInput?: string) => {
  const requested = dateInput && !Number.isNaN(new Date(dateInput).getTime())
    ? dayKey(new Date(dateInput))
    : dayKey(new Date());

  const day = await workforceServices.workforceForDay(requested);
  return {
    date: day.date,
    present: day.present,
    late: day.late,
    absent: day.absent,
    onLeave: day.onLeave,
    totalEmployees: day.totalEmployees,
    checkInRate: day.checkInRate,
    lateAfter: day.lateAfter,
    isHoliday: day.isHoliday,
    ...(day.holidayName ? { holidayName: day.holidayName } : {}),
  };
};

/** Who is in, out or on leave — one request for the dashboard's workforce card. */
const workforceToday = async (dateInput?: string) => workforceServices.workforceForDay(dateInput);

/** Payroll totals across every record, not just the loaded page. */
const payrollSummary = async () => {
  const [totals] = await payrollModel.aggregate([
    { $match: tenantFilter() },
    {
      $group: {
        _id: null,
        totalNetPay: { $sum: '$netPay' },
        totalRecords: { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
      },
    },
  ]);

  const totalRecords = totals?.totalRecords ?? 0;
  const completed = totals?.completed ?? 0;

  return {
    totalNetPay: totals?.totalNetPay ?? 0,
    totalRecords,
    completed,
    pending: totals?.pending ?? 0,
    processedRate: totalRecords > 0 ? Math.round((completed / totalRecords) * 100) : 0,
  };
};

/**
 * Creates one pending payroll record per active employee for a pay period.
 * Employees already paid for a period and employees without a salary on file
 * are skipped, so running it twice is safe.
 */
const generatePayroll = async (startInput: string, endInput: string, actorId?: string) => {
  if (!startInput || !endInput) {
    throw new AppError('Provide a valid pay period start and end date', StatusCode.BAD_REQUEST);
  }

  const start = isDayKey(startInput) ? startInput : dayKey(new Date(startInput));
  const end = isDayKey(endInput) ? endInput : dayKey(new Date(endInput));
  if (end < start) {
    throw new AppError('The pay period end must be after its start', StatusCode.BAD_REQUEST);
  }

  // A run carries the period, its status and its totals: a batch can now be
  // reviewed, approved, paid, exported and reversed as one unit.
  const result = await payrollRunServices.generateRun(
    { periodStart: start, periodEnd: end },
    actorId,
  );

  return { created: result.created, skipped: result.skipped, run: result.run };
};

const getOwnBalances = async (userId: string) => {
  const employee = await employeeModel.findOne({ userId });
  if (!employee) return [];
  return leaveBalanceModel.find({ employeeId: employee._id }).sort({ leaveType: 1 });
};

const getOwnEmployee = async (userId: string) => {
  const employee = await employeeModel
    .findOne({ userId })
    .populate('departmentId', 'name description');
  if (!employee) {
    throw new AppError(
      'No employee record is linked to your account yet',
      StatusCode.NOT_FOUND,
    );
  }
  return employee;
};

/**
 * The caller's own attendance history, newest first. Derived from the session's
 * employee record rather than a permission, so a manager who happens to hold
 * read_Attendance still only sees their own rows here.
 */
const getOwnAttendance = async (userId: string, query: PaginationQuery) => {
  const { page, limit, skip } = getPagination(query);
  const employee = await employeeModel.findOne({ userId });
  if (!employee) return paginatedResult([], 0, page, limit);

  const filter = { employeeId: employee._id };
  const [records, total] = await Promise.all([
    attendanceModel.find(filter).sort({ date: -1 }).skip(skip).limit(limit),
    attendanceModel.countDocuments(filter),
  ]);
  return paginatedResult(records, total, page, limit);
};

/** The caller's own appraisals with the cycle and appraiser attached. */
const getOwnAppraisals = async (userId: string) => {
  const employee = await employeeModel.findOne({ userId });
  if (!employee) return [];
  return appraisalModel
    .find({ employeeId: employee._id })
    .populate('cycleId', 'name startDate endDate status')
    .populate('appraiserId', 'name email')
    .sort({ reviewDate: -1 });
};

const listAuditLogs = async (query: PaginationQuery & { entity?: string }) => {
  const { page, limit, skip } = getPagination(query);
  const filter: Record<string, unknown> = {};
  if (query.entity) filter.entity = query.entity;

  const [logs, total] = await Promise.all([
    auditLogModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    auditLogModel.countDocuments(filter),
  ]);

  return paginatedResult(logs, total, page, limit);
};

export default {
  dashboardSummary,
  attendanceSummary,
  payrollSummary,
  generatePayroll,
  getOwnBalances,
  getOwnEmployee,
  getOwnAttendance,
  getOwnAppraisals,
  workforceToday,
  listAuditLogs,
};
