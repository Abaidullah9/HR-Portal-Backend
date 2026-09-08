import { StatusCode } from "../utils/helper/constants/enum";
import { AppError } from "../utils/helper/AppError";
import employeePayrollModel from "../models/employeePayroll.model";
import { CreatePayrollDTO } from "../utils/dtos/employeePayroll.dto";
import { MESSAGES } from "../utils/helper/constants/messages";
import { getPagination, paginatedResult, PaginationQuery } from "../utils/common";

const addPayroll = async (payrollData: CreatePayrollDTO) => {
  if (!payrollData) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const newPayroll = await employeePayrollModel.create(payrollData);
  return newPayroll;
};

const getAllPayroll = async (query: PaginationQuery) => {
  const { page, limit, skip } = getPagination(query);
  const allPayroll = await employeePayrollModel.find().populate("employeeId", "name email employeeCode position").skip(skip).limit(limit);
  const total = await employeePayrollModel.countDocuments();
  return paginatedResult(allPayroll, total, page, limit);
};

const getPayrollById = async (_id: string) => {
  if (!_id) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const payrollById = await employeePayrollModel.findById(_id).populate("employeeId", "name email employeeCode position");
  if (!payrollById) throw new AppError(MESSAGES.PAYROLL_NOT_FOUND, StatusCode.NOT_FOUND);
  return payrollById;
};

const getPayrollByEmployee = async (employeeId: string) => {
  if (!employeeId) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const payroll = await employeePayrollModel.find({ employeeId }).populate("employeeId", "name email employeeCode position");
  if (!payroll) throw new AppError(MESSAGES.PAYROLL_NOT_FOUND, StatusCode.NOT_FOUND);
  return payroll;
};

const getPayrollByPayPeriod = async (startDate: Date, endDate: Date) => {
  if (!startDate || !endDate) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const payroll = await employeePayrollModel.find({
    payPeriodStart: { $gte: startDate },
    payPeriodEnd: { $lte: endDate },
  }).populate("employeeId", "name email employeeCode position");
  if (!payroll) throw new AppError(MESSAGES.PAYROLL_NOT_FOUND, StatusCode.NOT_FOUND);
  return payroll;
};

const getPayrollByStatus = async (status: string) => {
  if (!status) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const filter: Record<string, unknown> = { status };
  const payroll = await employeePayrollModel.find(filter).populate("employeeId", "name email employeeCode position");
  if (!payroll) throw new AppError(MESSAGES.PAYROLL_NOT_FOUND, StatusCode.NOT_FOUND); 
  return payroll;
};

const updatePayroll = async (_id: string, updateData: Partial<CreatePayrollDTO>) => {
  if (!_id) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const updatedPayroll = await employeePayrollModel.findByIdAndUpdate(_id, updateData, { returnDocument: 'after' }).populate("employeeId", "name email employeeCode position");
  if (!updatedPayroll) throw new AppError(MESSAGES.PAYROLL_NOT_FOUND, StatusCode.NOT_FOUND);

  return updatedPayroll;
};

const updatePayrollStatus = async (_id: string, status: string) => {
  if (!_id || !status) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const updateFilter: Record<string, unknown> = { status };
  const updatedPayroll = await employeePayrollModel.findByIdAndUpdate(_id, updateFilter, { returnDocument: 'after' }).populate("employeeId", "name email employeeCode position");
  if (!updatedPayroll) throw new AppError(MESSAGES.PAYROLL_NOT_FOUND, StatusCode.NOT_FOUND);

  return updatedPayroll;
};

const deletePayroll = async (_id: string) => {
  if (!_id) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const deletedPayroll = await employeePayrollModel.findByIdAndDelete(_id);

  return deletedPayroll;
};

export default {
  addPayroll,
  getAllPayroll,
  getPayrollById,
  getPayrollByEmployee,
  getPayrollByPayPeriod,
  getPayrollByStatus,
  updatePayroll,
  updatePayrollStatus,
  deletePayroll,
};
