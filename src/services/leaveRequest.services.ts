import { StatusCode } from '../utils/helper/constants/enum';
import { AppError } from '../utils/helper/AppError';
import leaveRequestModel from '../models/leaveRequest.model';
import employeeModel from '../models/employee.model';
import organizationSettingModel from '../models/organizationSetting.model';
import { MESSAGES } from '../utils/helper/constants/messages';
import mongoose from 'mongoose';
import leaveBalanceServices from './leaveBalance.services';
import holidayServices from './holiday.services';
import notificationServices from './notification.services';
import { getPagination, paginatedResult, PaginationQuery } from '../utils/common';
import { canAccessEmployee, scopeEmployeeFilter, type ReadScope } from '../utils/helper/ownership';
import { tenantFields, tenantFilter } from '../utils/context';
import { dayKey, isDayKey, workingDaysBetween } from '../utils/dates';
import { CreateLeaveRequestDTO } from '../utils/dtos/leaveRequest.dto';

interface LeaveDates {
  fromDate: Date;
  toDate: Date;
}

/** Chargeable days for a request: weekdays only, minus public holidays. */
const chargeableDays = async (dates: LeaveDates): Promise<number> => {
  const from = dayKey(new Date(dates.fromDate));
  const to = dayKey(new Date(dates.toDate));
  const [settings, holidays] = await Promise.all([
    organizationSettingModel.findOne().lean(),
    holidayServices.holidayKeysBetween(from, to),
  ]);

  return workingDaysBetween(from, to, {
    ...(settings?.workingDays ? { workingDays: settings.workingDays } : {}),
    holidays,
  });
};

const assertDates = (dates: LeaveDates) => {
  const from = new Date(dates.fromDate);
  const to = new Date(dates.toDate);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw new AppError(MESSAGES.INVALID_DATE_FORMAT, StatusCode.BAD_REQUEST);
  }
  if (to < from) throw new AppError('The leave end date must be on or after the start date', StatusCode.BAD_REQUEST);
};

/**
 * Overlapping leave is the classic way a balance goes negative: two pending
 * requests for the same week, both approved. Any live request for the same
 * employee that intersects the range blocks the new one.
 */
const assertNoOverlap = async (employeeId: string, dates: LeaveDates, excludeId?: string) => {
  const filter: Record<string, unknown> = {
    employeeId,
    leaveStatus: { $in: ['pending', 'approved'] },
    fromDate: { $lte: new Date(dates.toDate) },
    toDate: { $gte: new Date(dates.fromDate) },
  };
  if (excludeId) filter._id = { $ne: excludeId };

  const clash = await leaveRequestModel.findOne(filter);
  if (clash) {
    throw new AppError(
      `This overlaps a ${clash.leaveStatus} ${clash.leaveType} request (${dayKey(clash.fromDate)} → ${dayKey(clash.toDate)}).`,
      StatusCode.CONFLICT,
    );
  }
};

const addLeaveRequest = async (requestData: CreateLeaveRequestDTO, scope?: ReadScope) => {
  if (!requestData) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);
  if (!requestData.employeeId) throw new AppError(MESSAGES.EMPLOYEE_ID_REQUIRED, StatusCode.BAD_REQUEST);

  // Without this an employee could file leave against a colleague's record.
  if (scope && !canAccessEmployee(scope, requestData.employeeId)) {
    throw new AppError(MESSAGES.NOT_AUTHORIZED, StatusCode.FORBIDDEN);
  }

  assertDates({ fromDate: new Date(requestData.fromDate), toDate: new Date(requestData.toDate) });
  await assertNoOverlap(requestData.employeeId, {
    fromDate: new Date(requestData.fromDate),
    toDate: new Date(requestData.toDate),
  });

  const days = await chargeableDays({
    fromDate: new Date(requestData.fromDate),
    toDate: new Date(requestData.toDate),
  });
  if (days === 0) {
    throw new AppError('That range contains no working days', StatusCode.BAD_REQUEST);
  }

  const newRequest = await leaveRequestModel.create({
    ...requestData,
    ...tenantFields(),
    workingDays: days,
  });
  await newRequest.populate('employeeId', 'name email employeeCode');

  // The requester's manager is the first approver; only when there is none does
  // the request go to everyone holding the approval action.
  const employee = await employeeModel.findOne(tenantFilter({ _id: newRequest.employeeId })).select('name reportingManagerId');
  const manager = employee?.reportingManagerId
    ? await employeeModel.findOne(tenantFilter({ _id: employee.reportingManagerId })).select('userId name')
    : null;

  const title = `${employee?.name ?? 'An employee'} requested ${newRequest.leaveType} leave`;
  const detail = `${dayKey(newRequest.fromDate)} → ${dayKey(newRequest.toDate)} (${days} working day${days === 1 ? '' : 's'})`;

  if (manager?.userId) {
    notificationServices.notifySafely(
      notificationServices.notifyUsers([manager.userId], {
        title,
        detail,
        href: '/leaves',
        kind: 'leave',
      }),
    );
  } else {
    notificationServices.notifySafely(
      notificationServices.notifyUsersWithAction('approveReject_LeaveRequest', {
        title,
        detail,
        href: '/leaves',
        kind: 'leave',
      }),
    );
  }

  return newRequest;
};

const getAllLeaveRequest = async (query: PaginationQuery & { status?: string }, scope: ReadScope) => {
  const { page, limit, skip } = getPagination(query);
  const filter: Record<string, unknown> = tenantFilter(scopeEmployeeFilter(scope));
  if (query.status) filter.leaveStatus = query.status;

  const allRequests = await leaveRequestModel
    .find(filter)
    .populate('employeeId', 'name email employeeCode')
    .populate('approvedById', 'name email employeeCode')
    .sort({ fromDate: -1 })
    .skip(skip)
    .limit(limit);
  const total = await leaveRequestModel.countDocuments(filter);
  return paginatedResult(allRequests, total, page, limit);
};

const getLeaveRequestById = async (_id: string, scope: ReadScope) => {
  if (!_id) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const requestById = await leaveRequestModel.findOne(tenantFilter({ _id }));
  if (!requestById) throw new AppError(MESSAGES.LEAVE_REQUEST_NOT_FOUND, StatusCode.NOT_FOUND);
  if (!canAccessEmployee(scope, requestById.employeeId.toString())) {
    throw new AppError(MESSAGES.NOT_AUTHORIZED, StatusCode.FORBIDDEN);
  }
  await requestById.populate('employeeId', 'name email employeeCode');
  await requestById.populate('approvedById', 'name email employeeCode');
  return requestById;
};

const getLeaveRequestsByEmployee = async (employeeId: string, scope: ReadScope) => {
  if (!employeeId) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);
  if (!canAccessEmployee(scope, employeeId)) {
    throw new AppError(MESSAGES.NOT_AUTHORIZED, StatusCode.FORBIDDEN);
  }

  return leaveRequestModel
    .find(tenantFilter({ employeeId }))
    .populate('employeeId', 'name email employeeCode')
    .populate('approvedById', 'name email employeeCode')
    .sort({ fromDate: -1 });
};

const getLeaveRequestsByStatus = async (status: string, scope: ReadScope) => {
  if (!status) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);
  const filter: Record<string, unknown> = tenantFilter({
    ...scopeEmployeeFilter(scope),
    leaveStatus: status,
  });
  return leaveRequestModel
    .find(filter)
    .populate('employeeId', 'name email employeeCode')
    .populate('approvedById', 'name email employeeCode');
};

const getLeaveRequestsByDateRange = async (startDate: Date, endDate: Date, scope: ReadScope) => {
  if (!startDate || !endDate) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const filter: Record<string, unknown> = tenantFilter({
    ...scopeEmployeeFilter(scope),
    leaveStatus: { $in: ['pending', 'approved'] },
    fromDate: { $lte: endDate },
    toDate: { $gte: startDate },
  });

  return leaveRequestModel
    .find(filter)
    .populate('employeeId', 'name email employeeCode')
    .populate('approvedById', 'name email employeeCode')
    .sort({ fromDate: 1 });
};

const updateLeaveRequest = async (
  _id: string,
  updateData: Partial<CreateLeaveRequestDTO>,
  scope: ReadScope,
) => {
  if (!_id) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const existingRequest = await leaveRequestModel.findOne(tenantFilter({ _id }));
  if (!existingRequest) throw new AppError(MESSAGES.LEAVE_REQUEST_NOT_FOUND, StatusCode.NOT_FOUND);
  if (!canAccessEmployee(scope, existingRequest.employeeId.toString())) {
    throw new AppError(MESSAGES.NOT_AUTHORIZED, StatusCode.FORBIDDEN);
  }

  // Allowing an edit after approval meant dates could be changed without a new
  // decision and without touching the balance.
  if (existingRequest.leaveStatus !== 'pending') {
    throw new AppError(
      'Only pending requests can be edited. Cancel and resubmit an approved request instead.',
      StatusCode.BAD_REQUEST,
    );
  }

  const fromDate = updateData.fromDate ? new Date(updateData.fromDate) : new Date(existingRequest.fromDate);
  const toDate = updateData.toDate ? new Date(updateData.toDate) : new Date(existingRequest.toDate);
  assertDates({ fromDate, toDate });
  await assertNoOverlap(existingRequest.employeeId.toString(), { fromDate, toDate }, _id);

  const days = await chargeableDays({ fromDate, toDate });
  if (days === 0) throw new AppError('That range contains no working days', StatusCode.BAD_REQUEST);

  const updatedRequest = await leaveRequestModel
    .findOneAndUpdate(tenantFilter({ _id }),
      { ...updateData, workingDays: days },
      { returnDocument: 'after' },
    )
    .populate('employeeId', 'name email employeeCode')
    .populate('approvedById', 'name email employeeCode');
  return updatedRequest;
};

const approveRejectLeave = async (
  requestId: string,
  approvalData: { leaveStatus: 'approved' | 'rejected'; approvedById: string; rejectionReason?: string },
  scope?: ReadScope,
) => {
  if (!requestId || !approvalData) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const request = await leaveRequestModel.findOne(tenantFilter({ _id: requestId }));
  if (!request) throw new AppError(MESSAGES.LEAVE_REQUEST_NOT_FOUND, StatusCode.NOT_FOUND);
  if (request.leaveStatus !== 'pending') throw new AppError(MESSAGES.CANNOT_UPDATE_NON_PENDING, StatusCode.BAD_REQUEST);

  if (scope) {
    const employeeId = request.employeeId.toString();
    if (!scope.canReadAll) {
      // A manager decides for their reports, never for themselves.
      if (scope.ownEmployeeId === employeeId) {
        throw new AppError('You cannot decide your own leave request', StatusCode.FORBIDDEN);
      }
      if (!canAccessEmployee(scope, employeeId)) {
        throw new AppError(MESSAGES.NOT_AUTHORIZED, StatusCode.FORBIDDEN);
      }
    }
  }

  const days = request.workingDays ?? (await chargeableDays(request));

  const applyDecision = async (session?: mongoose.ClientSession) => {
    request.leaveStatus = approvalData.leaveStatus;
    request.approvedById = new mongoose.Types.ObjectId(approvalData.approvedById);
    request.workingDays = days;
    if (approvalData.rejectionReason) request.rejectionReason = approvalData.rejectionReason;
    await request.save(session ? { session } : {});

    if (approvalData.leaveStatus === 'approved' && days > 0) {
      await leaveBalanceServices.deductLeaveBalance(
        request.employeeId.toString(),
        request.leaveType,
        new Date(request.fromDate).getFullYear(),
        days,
        session,
      );
    }
  };

  const session = await mongoose.startSession();
  let transactionStarted = false;
  try {
    session.startTransaction();
    transactionStarted = true;
    await applyDecision(session);
    await session.commitTransaction();
  } catch (error: unknown) {
    await session.abortTransaction().catch(() => {});

    // Standalone MongoDB (local dev) doesn't support multi-document transactions.
    const failure = error as { message?: string; code?: number };
    const txUnsupported = /retryable writes|Transaction numbers/i.test(failure?.message || '') || failure?.code === 20;
    if (!transactionStarted || !txUnsupported) throw error;

    request.$session(null);
    await applyDecision();
  } finally {
    session.endSession();
  }

  const employee = await employeeModel.findOne(tenantFilter({ _id: request.employeeId })).select('userId name');
  if (employee?.userId) {
    notificationServices.notifySafely(
      notificationServices.notifyUsers([employee.userId], {
        title: `Your ${request.leaveType} leave was ${approvalData.leaveStatus}`,
        detail: `${dayKey(request.fromDate)} → ${dayKey(request.toDate)} · ${days} working day${days === 1 ? '' : 's'}`,
        href: '/me',
        kind: 'leave',
      }),
    );
  }

  return request;
};

const cancelLeaveRequest = async (_id: string, scope: ReadScope) => {
  if (!_id) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const request = await leaveRequestModel.findOne(tenantFilter({ _id }));
  if (!request) throw new AppError(MESSAGES.LEAVE_REQUEST_NOT_FOUND, StatusCode.NOT_FOUND);

  const isOwner = scope.ownEmployeeId === request.employeeId.toString();
  if (!isOwner && !scope.canReadAll) {
    throw new AppError(MESSAGES.NOT_AUTHORIZED, StatusCode.FORBIDDEN);
  }
  if (!['pending', 'approved'].includes(request.leaveStatus)) {
    throw new AppError('Only pending or approved leave can be cancelled', StatusCode.BAD_REQUEST);
  }

  const wasApproved = request.leaveStatus === 'approved';
  const days = request.workingDays ?? 0;

  request.leaveStatus = 'cancelled';
  await request.save();

  // Cancelling approved leave used to be impossible; when it happens the days
  // must go back to the balance, otherwise the employee silently loses them.
  if (wasApproved && days > 0) {
    await leaveBalanceServices.refundLeaveBalance(
      request.employeeId.toString(),
      request.leaveType,
      new Date(request.fromDate).getFullYear(),
      days,
    );
  }

  return request;
};

const deleteLeaveRequest = async (_id: string, scope: ReadScope) => {
  if (!_id) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const existingRequest = await leaveRequestModel.findOne(tenantFilter({ _id }));
  if (!existingRequest) throw new AppError(MESSAGES.LEAVE_REQUEST_NOT_FOUND, StatusCode.NOT_FOUND);
  if (!canAccessEmployee(scope, existingRequest.employeeId.toString())) {
    throw new AppError(MESSAGES.NOT_AUTHORIZED, StatusCode.FORBIDDEN);
  }

  return leaveRequestModel.findOneAndDelete(tenantFilter({ _id }));
};

/** The team's approved absence in a window, for the leave calendar. */
const teamCalendar = async (scope: ReadScope, from: string, to: string) => {
  if (!isDayKey(from) || !isDayKey(to)) {
    throw new AppError('Provide the calendar window as YYYY-MM-DD', StatusCode.BAD_REQUEST);
  }

  return leaveRequestModel
    .find(
      tenantFilter({
        ...scopeEmployeeFilter(scope),
        leaveStatus: 'approved',
        fromDate: { $lte: new Date(`${to}T23:59:59.999Z`) },
        toDate: { $gte: new Date(`${from}T00:00:00.000Z`) },
      }),
    )
    .populate('employeeId', 'name employeeCode position')
    .sort({ fromDate: 1 })
    .lean();
};

export default {
  addLeaveRequest,
  getAllLeaveRequest,
  getLeaveRequestById,
  getLeaveRequestsByEmployee,
  getLeaveRequestsByStatus,
  getLeaveRequestsByDateRange,
  updateLeaveRequest,
  approveRejectLeave,
  cancelLeaveRequest,
  deleteLeaveRequest,
  teamCalendar,
  chargeableDays,
};
