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
import { organizationStatutorySettings } from "./organizationSetting.services";
import compensationServices from "./compensation.services";
import { allocatePayslipNumbers } from "./payslipSequence.services";
import { statutoryDeductionsForPeriod } from "../utils/payrollStatutory";
import { roundMoney, sameMoney, sumMoney } from "../utils/money";
import { dayKey } from "../utils/dates";

interface PayrollLine {
  type: string;
  amount: number;
  note?: string;
  taxable?: boolean;
}

const STATUTORY_LABELS = new Set(["income tax", "eobi", "provident fund"]);

const isStatutoryLine = (line: PayrollLine): boolean =>
  STATUTORY_LABELS.has((line.type ?? "").trim().toLowerCase());

const validateAmount = (value: unknown): number => {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new AppError(MESSAGES.PAYROLL_INVALID_AMOUNT, StatusCode.BAD_REQUEST);
  }
  return roundMoney(value);
};

const sanitizeLines = (items: PayrollLine[] | undefined, label: string): PayrollLine[] => {
  if (items === undefined || items === null) return [];
  if (!Array.isArray(items)) {
    throw new AppError(`${label} must be a list of line items`, StatusCode.BAD_REQUEST);
  }
  return items.map((item) => {
    if (!item || typeof item.type !== "string" || !item.type.trim()) {
      throw new AppError(`${label} need a name for every line`, StatusCode.BAD_REQUEST);
    }
    return {
      ...item,
      type: item.type.trim(),
      amount: validateAmount(item.amount),
    };
  });
};

const validatePeriod = (start: Date | string, end: Date | string): { start: Date; end: Date } => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    throw new AppError(MESSAGES.INVALID_DATE_FORMAT, StatusCode.BAD_REQUEST);
  }
  if (endDate < startDate) {
    throw new AppError(MESSAGES.PAYROLL_INVALID_PERIOD, StatusCode.BAD_REQUEST);
  }
  return { start: startDate, end: endDate };
};

const grossOf = (baseSalary: number, allowances: PayrollLine[], bonuses: PayrollLine[]): number =>
  sumMoney([baseSalary, ...allowances.map((line) => line.amount), ...bonuses.map((line) => line.amount)]);

const netOf = (grossPay: number, deductions: PayrollLine[]): number =>
  roundMoney(Math.max(grossPay - sumMoney(deductions.map((line) => line.amount)), 0));

/**
 * Statutory deductions for a hand-entered record.
 *
 * Payroll runs price tax from the contractual salary; a manual record does the
 * same so a half-month entry cannot annualise a halved salary and withhold
 * nothing. Taxable allowances and bonuses count towards the taxable pay, but
 * the contractual figure stays the monthly salary.
 */
const autoStatutoryDeductions = async (input: {
  employeeId: string;
  baseSalary: number;
  allowances: PayrollLine[];
  bonuses: PayrollLine[];
  periodEnd: Date;
}): Promise<PayrollLine[]> => {
  const settings = await organizationStatutorySettings();
  const contractual =
    (await compensationServices.salaryEffectiveOn(input.employeeId, dayKey(input.periodEnd))) ??
    input.baseSalary;
  const taxableAllowances = input.allowances.filter((line) => line.taxable !== false);
  const taxablePay = grossOf(input.baseSalary, taxableAllowances, input.bonuses);

  return statutoryDeductionsForPeriod(
    { contractualMonthly: Math.max(contractual, input.baseSalary), taxablePay },
    settings,
  ).deductions;
};

const assertEditable = (record: { payRunId?: unknown; status?: string }) => {
  if (record.payRunId) {
    throw new AppError(MESSAGES.PAYROLL_RUN_OWNED_READ_ONLY, StatusCode.CONFLICT);
  }
  if (record.status === "completed") {
    throw new AppError(MESSAGES.PAYROLL_COMPLETED_READ_ONLY, StatusCode.CONFLICT);
  }
};

const addPayroll = async (payrollData: CreatePayrollDTO) => {
  if (!payrollData) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);
  if (!payrollData.employeeId) throw new AppError(MESSAGES.EMPLOYEE_ID_REQUIRED, StatusCode.BAD_REQUEST);
  // The client no longer gets to state the amount that leaves the bank.
  if (payrollData.netPay !== undefined) {
    throw new AppError(MESSAGES.PAYROLL_NET_PAY_CALCULATED, StatusCode.BAD_REQUEST);
  }
  if (payrollData.status && payrollData.status !== "pending") {
    throw new AppError(MESSAGES.PAYROLL_CREATE_AS_PENDING, StatusCode.BAD_REQUEST);
  }

  // The employee must exist inside the caller's organisation; an id from
  // another tenant must not be able to attract a payslip.
  const employee = await employeeModel.findOne(tenantFilter({ _id: payrollData.employeeId }));
  if (!employee) throw new AppError(MESSAGES.EMPLOYEE_NOT_FOUND, StatusCode.NOT_FOUND);

  const baseSalary = validateAmount(payrollData.baseSalary);
  const allowances = sanitizeLines(payrollData.allowances, "Allowances");
  const bonuses = sanitizeLines(payrollData.bonuses, "Bonuses");
  const provided = sanitizeLines(payrollData.deductions, "Deductions");
  const period = validatePeriod(payrollData.payPeriodStart, payrollData.payPeriodEnd);

  let deductions: PayrollLine[];
  if (provided.some(isStatutoryLine)) {
    if (!payrollData.overrideReason?.trim()) {
      throw new AppError(MESSAGES.PAYROLL_OVERRIDE_REASON_REQUIRED, StatusCode.BAD_REQUEST);
    }
    deductions = provided;
  } else {
    deductions = [
      ...provided,
      ...(await autoStatutoryDeductions({
        employeeId: payrollData.employeeId,
        baseSalary,
        allowances,
        bonuses,
        periodEnd: period.end,
      })),
    ];
  }

  const grossPay = grossOf(baseSalary, allowances, bonuses);
  const newPayroll = await employeePayrollModel.create({
    employeeId: payrollData.employeeId,
    baseSalary,
    allowances,
    bonuses,
    deductions,
    netPay: netOf(grossPay, deductions),
    payPeriodStart: period.start,
    payPeriodEnd: period.end,
    paymentMethod: payrollData.paymentMethod,
    status: "pending",
    ...(payrollData.datePaid ? { datePaid: new Date(payrollData.datePaid) } : {}),
    ...tenantFields(),
  });
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

  const payrollById = await employeePayrollModel.findOne(tenantFilter({ _id })).populate("employeeId", "name email employeeCode position");
  if (!payrollById) throw new AppError(MESSAGES.PAYROLL_NOT_FOUND, StatusCode.NOT_FOUND);
  if (scope && !canAccessEmployee(scope, (payrollById.employeeId as unknown as { _id?: { toString(): string } })?._id?.toString() ?? "")) {
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

/**
 * Payslip breakdown derived from the stored record.
 *
 * `netPay` is the amount actually recorded, so the payslip and the payroll row
 * never disagree. `calculatedNetPay` re-adds the lines; when the two differ the
 * response says so instead of quietly showing a breakdown that does not add up.
 */
const buildPayslip = (record: any) => {
  const employee = record.employeeId;
  const allowances: { type: string; amount: number }[] = record.allowances ?? [];
  const bonuses: { type: string; amount: number }[] = record.bonuses ?? [];
  const deductions: { type: string; amount: number; note?: string }[] = record.deductions ?? [];

  const grossPay = sumMoney([record.baseSalary ?? 0, ...allowances.map((item) => item.amount), ...bonuses.map((item) => item.amount)]);
  const totalDeductions = sumMoney(deductions.map((item) => item.amount));
  const calculatedNetPay = roundMoney(Math.max(grossPay - totalDeductions, 0));
  const netPay = Number.isFinite(record.netPay) ? roundMoney(record.netPay) : calculatedNetPay;

  return {
    id: record._id.toString(),
    employee: {
      id: employee?._id?.toString(),
      name: employee?.name ?? "Unknown employee",
      code: employee?.employeeCode,
      position: employee?.position,
    },
    payslipNumber: record.payslipNumber,
    periodStart: record.payPeriodStart,
    periodEnd: record.payPeriodEnd,
    paymentMethod: record.paymentMethod,
    currency: record.currency ?? "PKR",
    status: record.status,
    datePaid: record.datePaid,
    earnings: [
      { label: "Base salary", amount: roundMoney(record.baseSalary ?? 0) },
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
    netPay,
    calculatedNetPay,
    reconciles: sameMoney(netPay, calculatedNetPay),
  };
};

const getPayslip = async (_id: string, scope?: ReadScope) => {
  if (!_id) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const record = await employeePayrollModel
    .findOne(tenantFilter({ _id }))
    .populate("employeeId", "name email employeeCode position");
  if (!record) throw new AppError(MESSAGES.PAYROLL_NOT_FOUND, StatusCode.NOT_FOUND);

  const employeeId = (record.employeeId as unknown as { _id?: { toString(): string } })?._id?.toString() ?? "";
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

  const existing = await employeePayrollModel.findOne(tenantFilter({ _id }));
  if (!existing) throw new AppError(MESSAGES.PAYROLL_NOT_FOUND, StatusCode.NOT_FOUND);
  assertEditable(existing);

  if (updateData.netPay !== undefined) {
    throw new AppError(MESSAGES.PAYROLL_NET_PAY_CALCULATED, StatusCode.BAD_REQUEST);
  }
  if (updateData.status !== undefined) {
    throw new AppError(MESSAGES.PAYROLL_STATUS_ENDPOINT_ONLY, StatusCode.BAD_REQUEST);
  }

  const baseSalary = updateData.baseSalary !== undefined ? validateAmount(updateData.baseSalary) : existing.baseSalary;
  const allowances = updateData.allowances !== undefined
    ? sanitizeLines(updateData.allowances, "Allowances")
    : ((existing.allowances ?? []) as PayrollLine[]);
  const bonuses = updateData.bonuses !== undefined
    ? sanitizeLines(updateData.bonuses, "Bonuses")
    : ((existing.bonuses ?? []) as PayrollLine[]);
  const period = updateData.payPeriodStart !== undefined || updateData.payPeriodEnd !== undefined
    ? validatePeriod(
        updateData.payPeriodStart ?? existing.payPeriodStart,
        updateData.payPeriodEnd ?? existing.payPeriodEnd,
      )
    : { start: existing.payPeriodStart, end: existing.payPeriodEnd };

  const payLinesChanged = (["baseSalary", "allowances", "bonuses", "payPeriodStart", "payPeriodEnd"] as const)
    .some((key) => key in updateData);

  let deductions: PayrollLine[];
  if (updateData.deductions !== undefined) {
    const provided = sanitizeLines(updateData.deductions, "Deductions");
    if (provided.some(isStatutoryLine)) {
      if (!updateData.overrideReason?.trim()) {
        throw new AppError(MESSAGES.PAYROLL_OVERRIDE_REASON_REQUIRED, StatusCode.BAD_REQUEST);
      }
      deductions = provided;
    } else {
      deductions = [
        ...provided,
        ...(await autoStatutoryDeductions({
          employeeId: existing.employeeId.toString(),
          baseSalary,
          allowances,
          bonuses,
          periodEnd: period.end,
        })),
      ];
    }
  } else if (payLinesChanged) {
    // Re-derive the statutory lines from the new amounts and keep anything HR
    // added by hand (a loan repayment, for example).
    const manual = ((existing.deductions ?? []) as PayrollLine[]).filter((line) => !isStatutoryLine(line));
    deductions = [
      ...manual,
      ...(await autoStatutoryDeductions({
        employeeId: existing.employeeId.toString(),
        baseSalary,
        allowances,
        bonuses,
        periodEnd: period.end,
      })),
    ];
  } else {
    deductions = (existing.deductions ?? []) as PayrollLine[];
  }

  const grossPay = grossOf(baseSalary, allowances, bonuses);
  const updatedPayroll = await employeePayrollModel.findOneAndUpdate(
    tenantFilter({ _id }),
    {
      baseSalary,
      allowances,
      bonuses,
      deductions,
      netPay: netOf(grossPay, deductions),
      payPeriodStart: period.start,
      payPeriodEnd: period.end,
      ...(updateData.paymentMethod !== undefined ? { paymentMethod: updateData.paymentMethod } : {}),
      ...(updateData.datePaid !== undefined ? { datePaid: updateData.datePaid ? new Date(updateData.datePaid) : null } : {}),
    },
    { returnDocument: "after", runValidators: true },
  ).populate("employeeId", "name email employeeCode position");
  if (!updatedPayroll) throw new AppError(MESSAGES.PAYROLL_NOT_FOUND, StatusCode.NOT_FOUND);

  return updatedPayroll;
};

const updatePayrollStatus = async (_id: string, status: string) => {
  if (!_id || !status) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);
  if (!["completed", "failed"].includes(status)) {
    throw new AppError(MESSAGES.PAYROLL_INVALID_STATUS, StatusCode.BAD_REQUEST);
  }

  const existing = await employeePayrollModel.findOne(tenantFilter({ _id }));
  if (!existing) throw new AppError(MESSAGES.PAYROLL_NOT_FOUND, StatusCode.NOT_FOUND);
  assertEditable(existing);
  if (existing.status !== "pending" && existing.status !== "failed") {
    throw new AppError(MESSAGES.PAYROLL_NOT_PENDING, StatusCode.CONFLICT);
  }

  // Paying a hand-entered record consumes a reference from the same counter the
  // runs use, so two payslips can never share a number.
  let payslipNumber = existing.payslipNumber;
  if (status === "completed" && !payslipNumber) {
    const [number] = await allocatePayslipNumbers(dayKey(existing.payPeriodStart).slice(0, 7), 1);
    payslipNumber = number;
  }

  const updatedPayroll = await employeePayrollModel.findOneAndUpdate(
    tenantFilter({ _id }),
    {
      status,
      ...(status === "completed"
        ? { datePaid: existing.datePaid ?? new Date(), ...(payslipNumber ? { payslipNumber } : {}) }
        : {}),
    },
    { returnDocument: "after" },
  ).populate("employeeId", "name email employeeCode position");
  if (!updatedPayroll) throw new AppError(MESSAGES.PAYROLL_NOT_FOUND, StatusCode.NOT_FOUND);

  // Not awaited on purpose: a mail outage must never fail or slow this update.
  if (status === "completed") {
    notifyPayslipCompleted(updatedPayroll);
  }

  return updatedPayroll;
};

const deletePayroll = async (_id: string) => {
  if (!_id) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const existing = await employeePayrollModel.findOne(tenantFilter({ _id }));
  if (!existing) throw new AppError(MESSAGES.PAYROLL_NOT_FOUND, StatusCode.NOT_FOUND);
  assertEditable(existing);

  return employeePayrollModel.findOneAndDelete(tenantFilter({ _id }));
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
