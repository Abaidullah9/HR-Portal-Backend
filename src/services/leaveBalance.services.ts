import { StatusCode } from "../utils/helper/constants/enum";
import { AppError } from "../utils/helper/AppError";
import leaveBalanceModel from "../models/leaveBalance.model";
import { CreateLeaveBalanceDTO } from "../utils/dtos/leaveBalance.dto";
import { MESSAGES } from "../utils/helper/constants/messages";
import mongoose from "mongoose";
import { getPagination, paginatedResult, PaginationQuery } from "../utils/common";

import { tenantFields, tenantFilter } from "../utils/context";

const addLeaveBalance = async (balanceData: CreateLeaveBalanceDTO) => {
  if (!balanceData) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const newBalance = await leaveBalanceModel.create({ ...balanceData, ...tenantFields() });
  return newBalance;
};

const getAllLeaveBalance = async (query: PaginationQuery) => {
  const { page, limit, skip } = getPagination(query);
  const allBalances = await leaveBalanceModel.find(tenantFilter()).populate("employeeId", "name email employeeCode").skip(skip).limit(limit);
  const total = await leaveBalanceModel.countDocuments(tenantFilter());
  return paginatedResult(allBalances, total, page, limit);
};

const getLeaveBalanceById = async (_id: string) => {
  if (!_id) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const balanceById = await leaveBalanceModel.findOne(tenantFilter({ _id })).populate("employeeId", "name email employeeCode");
  if (!balanceById) throw new AppError(MESSAGES.LEAVE_BALANCE_NOT_FOUND, StatusCode.NOT_FOUND);
  return balanceById;
};

const getLeaveBalancesByEmployee = async (employeeId: string) => {
  if (!employeeId) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const balances = await leaveBalanceModel.find({ employeeId }).populate("employeeId", "name email employeeCode");
  if (!balances) throw new AppError(MESSAGES.LEAVE_BALANCE_NOT_FOUND, StatusCode.NOT_FOUND);
  return balances;
};

const getLeaveBalanceByEmployeeAndType = async (employeeId: string, leaveType: string, year: number) => {
  if (!employeeId || !leaveType || !year) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const balance = await leaveBalanceModel.findOne({ employeeId, leaveType, year }).populate("employeeId", "name email employeeCode");
  if (!balance) throw new AppError(MESSAGES.LEAVE_BALANCE_NOT_FOUND, StatusCode.NOT_FOUND);
  return balance;
};

const getAllLeaveBalanceByYear = async (year: number, query: PaginationQuery) => {
  if (!year) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const { page, limit, skip } = getPagination(query);
  const balances = await leaveBalanceModel.find({ year }).populate("employeeId", "name email employeeCode").skip(skip).limit(limit);
  const total = await leaveBalanceModel.countDocuments({ year });
  return paginatedResult(balances, total, page, limit);
};

const deductLeaveBalance = async (employeeId: string, leaveType: string, year: number, days: number, session?: mongoose.ClientSession) => {
  if (!employeeId || !leaveType || !year || !days) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const balance = await leaveBalanceModel.findOne({ employeeId, leaveType, year }).session(session || null);
  if (!balance) {
    throw new AppError(MESSAGES.LEAVE_BALANCE_NOT_FOUND, StatusCode.NOT_FOUND);
  }

  if ((balance.remaining || 0) < days) {
    throw new AppError(MESSAGES.INSUFFICIENT_LEAVE_BALANCE, StatusCode.BAD_REQUEST);
  }

  balance.used = (balance.used || 0) + days;
  // Remaining is its own running figure: with accrual it can sit below the
  // entitlement, so it drains by the days taken rather than being recomputed.
  balance.remaining = Math.max((balance.remaining || 0) - days, 0);
  await balance.save(session ? { session } : {});

  return balance;
};

/**
 * Returns days to a balance, capped at the annual entitlement. Used when an
 * approved leave is cancelled, so the employee gets the days back instead of
 * having to ask HR to correct the balance by hand.
 */
const refundLeaveBalance = async (employeeId: string, leaveType: string, year: number, days: number) => {
  if (!employeeId || !leaveType || !year || !days) {
    throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);
  }

  const balance = await leaveBalanceModel.findOne({ employeeId, leaveType, year });
  if (!balance) throw new AppError(MESSAGES.LEAVE_BALANCE_NOT_FOUND, StatusCode.NOT_FOUND);

  balance.used = Math.max((balance.used || 0) - days, 0);
  const cap = Math.max(balance.totalAllocated - balance.used, 0);
  balance.remaining = Math.min((balance.remaining || 0) + days, cap);
  await balance.save();
  return balance;
};

const monthsBetween = (from: Date, to: Date) =>
  Math.max(
    (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth()),
    0,
  );

/**
 * Posts monthly accrual into `remaining`, capped at the annual entitlement that
 * has not been used yet. Idempotent per month: `lastAccruedAt` records how far
 * each balance has been advanced, so restarts and repeated runs add nothing.
 */
const accrueLeaveBalances = async (now: Date = new Date()) => {
  const balances = await leaveBalanceModel.find(tenantFilter({ accrualRate: { $gt: 0 } }));
  let updated = 0;

  for (const balance of balances) {
    const rate = balance.accrualRate ?? 0;
    if (rate <= 0) continue;

    const from = balance.lastAccruedAt ?? new Date(balance.year, 0, 1);
    const months = monthsBetween(from, now);
    if (months <= 0) continue;

    const cap = Math.max(balance.totalAllocated - balance.used, 0);
    balance.remaining = Math.min((balance.remaining || 0) + months * rate, cap);
    balance.lastAccruedAt = now;
    await balance.save();
    updated += 1;
  }

  return { updated, scanned: balances.length };
};

const updateLeaveBalance = async (_id: string, updateData: Partial<CreateLeaveBalanceDTO>) => {
  if (!_id) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const updatedBalance = await leaveBalanceModel.findOneAndUpdate(tenantFilter({ _id }), updateData, { returnDocument: 'after' }).populate("employeeId", "name email employeeCode");
  if (!updatedBalance) throw new AppError(MESSAGES.LEAVE_BALANCE_NOT_FOUND, StatusCode.NOT_FOUND);

  return updatedBalance;
};

const deleteLeaveBalance = async (_id: string) => {
  if (!_id) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const deletedBalance = await leaveBalanceModel.findOneAndDelete(tenantFilter({ _id }));

  return deletedBalance;
};

export default {
  addLeaveBalance,
  getAllLeaveBalance,
  getLeaveBalanceById,
  getLeaveBalancesByEmployee,
  getLeaveBalanceByEmployeeAndType,
  getAllLeaveBalanceByYear,
  deductLeaveBalance,
  refundLeaveBalance,
  accrueLeaveBalances,
  updateLeaveBalance,
  deleteLeaveBalance,
};
