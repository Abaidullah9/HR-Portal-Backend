import LeaveBalance from "../models/leaveBalance.model";
import { AppError } from "../utils/helper/AppError";
import { CreateLeaveBalanceDTO, UpdateLeaveBalanceDTO } from "../utils/dtos/leaveBalance.dto";

const addLeaveBalance = async (balanceData: CreateLeaveBalanceDTO) => {
  if (!balanceData.employeeId || !balanceData.leaveType || balanceData.totalAllocated === undefined || !balanceData.year) {
    throw new AppError("Missing required fields: employeeId, leaveType, totalAllocated, year", 400);
  }

  const existingBalance = await LeaveBalance.findOne({
    employeeId: balanceData.employeeId,
    leaveType: balanceData.leaveType,
    year: balanceData.year,
  });
  if (existingBalance) {
    throw new AppError("Leave balance already exists for this employee, leave type and year", 409);
  }

  const balanceDataWithRemaining = {
    ...balanceData,
    remaining: balanceData.remaining ?? balanceData.totalAllocated,
    used: balanceData.used ?? 0,
  };

  const balance = await LeaveBalance.create(balanceDataWithRemaining);
  return balance;
};

const getLeaveBalancesByEmployee = async (employeeId: string) => {
  const balances = await LeaveBalance.find({ employeeId }).sort({ year: -1 });
  return balances;
};

const getLeaveBalanceByEmployeeAndType = async (employeeId: string, leaveType: string, year: number) => {
  const balance = await LeaveBalance.findOne({ employeeId, leaveType, year });
  if (!balance) {
    throw new AppError("Leave balance not found", 404);
  }
  return balance;
};

const getLeaveBalanceById = async (balanceId: string) => {
  const balance = await LeaveBalance.findById(balanceId);
  if (!balance) {
    throw new AppError("Leave balance not found", 404);
  }
  return balance;
};

const getAllLeaveBalanceByYear = async (year: number) => {
  const balances = await LeaveBalance.find({ year }).populate("employeeId", "name email employeeCode");
  return balances;
};

const deductLeaveBalance = async (employeeId: string, leaveType: string, year: number, days: number) => {
  const balance = await LeaveBalance.findOne({ employeeId, leaveType, year });
  if (!balance) {
    throw new AppError("Leave balance not found", 404);
  }

  if (balance.remaining < days) {
    throw new AppError("Insufficient leave balance", 400);
  }

  balance.used = (balance.used || 0) + days;
  balance.remaining = balance.totalAllocated - balance.used;
  await balance.save();

  return balance;
};

const updateLeaveBalance = async (balanceId: string, updateData: UpdateLeaveBalanceDTO) => {
  const balance = await LeaveBalance.findByIdAndUpdate(balanceId, updateData, { new: true, runValidators: true });
  if (!balance) {
    throw new AppError("Leave balance not found", 404);
  }
  return balance;
};

const deleteLeaveBalance = async (balanceId: string) => {
  const balance = await LeaveBalance.findByIdAndDelete(balanceId);
  if (!balance) {
    throw new AppError("Leave balance not found", 404);
  }
  return balance;
};

export default {
  addLeaveBalance,
  getLeaveBalancesByEmployee,
  getLeaveBalanceByEmployeeAndType,
  getLeaveBalanceById,
  getAllLeaveBalanceByYear,
  deductLeaveBalance,
  updateLeaveBalance,
  deleteLeaveBalance,
};
