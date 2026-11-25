import { StatusCode } from "../utils/helper/constants/enum";
import { AppError } from "../utils/helper/AppError";
import employeePayrollModel from "../models/employeePayroll.model";
import { CreatePayrollDTO } from "../utils/dtos/employeePayroll.dto";
import { MESSAGES } from "../utils/helper/constants/messages";
import { getPagination, paginatedResult, PaginationQuery } from "../utils/common";
import employeeModel from "../models/employee.model";
import { canAccessEmployee, scopeEmployeeFilter, type ReadScope } from "../utils/helper/ownership";
import { tenantFields, tenantFilter } from "../utils/context";
import { notifyPayslipCompleted } from "./payslipNotification.services";

const addPayroll = async (payrollData: CreatePayrollDTO) => {
  if (!payrollData) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const newPayroll = await employeePayrollModel.create({ ...payrollData, ...tenantFields() });
  return newPayroll;
};

const getAllPayroll = async (query: PaginationQuery, scope?: ReadScope) => {
  const { page, limit, skip } = getPagination(query);
  const filter: Record<string, unknown> = tenantFilter(scope ? scopeEmployeeFilter(scope) : {});
  const allPayroll = await employeePayrollModel.find(filter).populate("employeeId", "name email employeeCode position").skip(skip).limit(limit);
  const total = await employeePayrollModel.countDocuments(filter);
  return paginatedResult(allPayroll, total, page, limit);
};

const getPayrollById = async (_id: string, scope?: ReadScope) => {
  if (!_id) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const payrollById = await employeePayrollModel.findById(_id).populate("employeeId", "name email employeeCode position");
  if (!payrollById) throw new AppError(MESSAGES.PAYROLL_NOT_FOUND, StatusCode.NOT_FOUND);
  if (scope && !canAccessEmployee(scope, (payrollById.employeeId as unknown as { _id?: { toString(): string } })?._id?.toString() ?? '')) {
    throw new AppError(MESSAGES.NOT_AUTHORIZED, StatusCode.FORBIDDEN);
  }
  return payrollById;
};

const getPayrollByEmployee = async (employeeId: string, scope?: ReadScope) => {
  if (!employeeId) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);
  if (scope && !canAccessEmployee(scope, employeeId)) {
    throw new AppError(MESSAGES.NOT_AUTHORIZED, StatusCode.FORBIDDEN);
  }

  return employeePayrollModel.find(tenantFilter({ employeeId })).populate("employeeId", "name email employeeCode position");
};

const getPayrollByPayPeriod = async (startDate: Date, endDate: Date) => {
  if (!startDate || !endDate) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  return employeePayrollModel.find(tenantFilter({
    payPeriodStart: { $gte: startDate },
    payPeriodEnd: { $lte: endDate },
  })).populate("employeeId", "name email employeeCode position");
};

const getPayrollByStatus = async (status: string) => {
  if (!status) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  return employeePayrollModel.find(tenantFilter({ status })).populate("employeeId", "name email employeeCode position");
};

const roundMoney = (value: number) => Math.round(value * 100) / 100;
const sumAmounts = (items: { amount?: number }[] | undefined) =>
  (items ?? []).reduce((total, item) => total + (item.amount ?? 0), 0);

/**
 * Payslip breakdown derived from the stored record, so earnings and deductions
 * always reconcile with net pay instead of drifting from it.
 */
const buildPayslip = (record: any) => {
  const employee = record.employeeId;
  const allowances: { type: string; amount: number }[] = record.allowances ?? [];
  const bonuses: { type: string; amount: number }[] = record.bonuses ?? [];
  const deductions: { type: string; amount: number; note?: string }[] = record.deductions ?? [];

  const grossPay = roundMoney(record.baseSalary + sumAmounts(allowances) + sumAmounts(bonuses));
  const totalDeductions = roundMoney(sumAmounts(deductions));

  return {
    id: record._id.toString(),
    employee: {
      id: employee?._id?.toString(),
      name: employee?.name ?? 'Unknown employee',
      code: employee?.employeeCode,
      position: employee?.position,
    },
    periodStart: record.payPeriodStart,
    periodEnd: record.payPeriodEnd,
    paymentMethod: record.paymentMethod,
    status: record.status,
    datePaid: record.datePaid,
    earnings: [
      { label: 'Base salary', amount: roundMoney(record.baseSalary) },
      ...allowances.map((item) => ({ label: item.type, amount: roundMoney(item.amount) })),
      ...bonuses.map((item) => ({ label: item.type, amount: roundMoney(item.amount) })),
    ],
    deductions: deductions.map((item) => ({
      label: item.type,
      amount: roundMoney(item.amount),
      note: item.note,
    })),
    grossPay,
    totalDeductions,
    netPay: roundMoney(grossPay - totalDeductions),
  };
};

const getPayslip = async (_id: string, scope?: ReadScope) => {
  if (!_id) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const record = await employeePayrollModel
    .findById(_id)
    .populate("employeeId", "name email employeeCode position");
  if (!record) throw new AppError(MESSAGES.PAYROLL_NOT_FOUND, StatusCode.NOT_FOUND);

  const employeeId = (record.employeeId as unknown as { _id?: { toString(): string } })?._id?.toString() ?? '';
  if (scope && !canAccessEmployee(scope, employeeId)) {
    throw new AppError(MESSAGES.NOT_AUTHORIZED, StatusCode.FORBIDDEN);
  }

  return buildPayslip(record);
};

/** Self-service: the employee is resolved from the session, never the client. */
const getOwnPayslips = async (userId: string) => {
  const employee = await employeeModel.findOne({ userId }).select("_id");
  // Staff accounts have no employee profile, and so no payslips of their own.
  if (!employee) return [];

  const records = await employeePayrollModel
    .find(tenantFilter({ employeeId: employee._id }))
    .populate("employeeId", "name email employeeCode position")
    .sort({ payPeriodStart: -1 })
    .limit(24);
  return records.map((record) => buildPayslip(record));
};

const updatePayroll = async (_id: string, updateData: Partial<CreatePayrollDTO>) => {
  if (!_id) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const updatedPayroll = await employeePayrollModel.findOneAndUpdate(tenantFilter({ _id }), updateData, { returnDocument: 'after' }).populate("employeeId", "name email employeeCode position");
  if (!updatedPayroll) throw new AppError(MESSAGES.PAYROLL_NOT_FOUND, StatusCode.NOT_FOUND);

  return updatedPayroll;
};

const updatePayrollStatus = async (_id: string, status: string) => {
  if (!_id || !status) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  // The previous status decides whether this is the transition into "paid" that
  // should notify the employee; re-saving a completed record must not re-send.
  const existing = await employeePayrollModel.findOne(tenantFilter({ _id }));
  if (!existing) throw new AppError(MESSAGES.PAYROLL_NOT_FOUND, StatusCode.NOT_FOUND);

  const updatedPayroll = await employeePayrollModel.findOneAndUpdate(
    tenantFilter({ _id }),
    { status },
    { returnDocument: 'after' },
  ).populate("employeeId", "name email employeeCode position");
  if (!updatedPayroll) throw new AppError(MESSAGES.PAYROLL_NOT_FOUND, StatusCode.NOT_FOUND);

  // Not awaited on purpose: a mail outage must never fail or slow this update.
  if (status === 'completed' && existing.status !== 'completed') {
    notifyPayslipCompleted(updatedPayroll);
  }

  return updatedPayroll;
};

const deletePayroll = async (_id: string) => {
  if (!_id) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const deletedPayroll = await employeePayrollModel.findOneAndDelete(tenantFilter({ _id }));

  return deletedPayroll;
};

export default {
  addPayroll,
  getAllPayroll,
  getPayrollById,
  getPayrollByEmployee,
  getPayrollByPayPeriod,
  getPayrollByStatus,
  getPayslip,
  getOwnPayslips,
  updatePayroll,
  updatePayrollStatus,
  deletePayroll,
};
