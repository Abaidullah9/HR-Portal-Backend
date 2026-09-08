import { StatusCode } from "../utils/helper/constants/enum";
import { AppError } from "../utils/helper/AppError";
import leaveBalanceModel from "../models/leaveBalance.model";
import { CreateLeaveBalanceDTO } from "../utils/dtos/leaveBalance.dto";
import { MESSAGES } from "../utils/helper/constants/messages";
import mongoose from "mongoose";
import { getPagination, paginatedResult, PaginationQuery } from "../utils/common";

const addLeaveBalance = async (balanceData: CreateLeaveBalanceDTO) => {
  if (!balanceData) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const newBalance = await leaveBalanceModel.create(balanceData);
  return newBalance;
};

const getAllLeaveBalance = async (query: PaginationQuery) => {
  const { page, limit, skip } = getPagination(query);
  const allBalances = await leaveBalanceModel.find().populate("employeeId", "name email employeeCode").skip(skip).limit(limit);
  const total = await leaveBalanceModel.countDocuments();
  return paginatedResult(allBalances, total, page, limit);
};

const getLeaveBalanceById = async (_id: string) => {
  if (!_id) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const balanceById = await leaveBalanceModel.findById(_id).populate("employeeId", "name email employeeCode");
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
  balance.remaining = balance.totalAllocated - balance.used;
  await balance.save(session ? { session } : {});

  return balance;
};

const updateLeaveBalance = async (_id: string, updateData: Partial<CreateLeaveBalanceDTO>) => {
  if (!_id) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const updatedBalance = await leaveBalanceModel.findByIdAndUpdate(_id, updateData, { returnDocument: 'after' }).populate("employeeId", "name email employeeCode");
  if (!updatedBalance) throw new AppError(MESSAGES.LEAVE_BALANCE_NOT_FOUND, StatusCode.NOT_FOUND);

  return updatedBalance;
};

const deleteLeaveBalance = async (_id: string) => {
  if (!_id) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const deletedBalance = await leaveBalanceModel.findByIdAndDelete(_id);

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
  updateLeaveBalance,
  deleteLeaveBalance,
};
