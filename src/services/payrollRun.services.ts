import mongoose from 'mongoose';
import payrollRunModel from '../models/payrollRun.model';
import payrollModel from '../models/employeePayroll.model';
import employeeModel from '../models/employee.model';
import leaveRequestModel from '../models/leaveRequest.model';
import userModel from '../models/user.model';
import compensationServices from './compensation.services';
import notificationServices from './notification.services';
import holidayServices from './holiday.services';
import { organizationStatutorySettings } from './organizationSetting.services';
import { notifyPayslipCompleted } from './payslipNotification.services';
import { AppError } from '../utils/helper/AppError';
import { StatusCode } from '../utils/helper/constants/enum';
import { tenantFields, tenantFilter } from '../utils/context';
import {
  dayRate,
  proratedSalary,
  statutoryDeductions,
  unpaidLeaveDays,
  type UnpaidLeaveLike,
} from '../utils/payrollStatutory';
import { endOfDay, isDayKey, startOfDay, todayKey, workingDaysBetween } from '../utils/dates';
import { toCsv } from '../utils/csv';
import { getPagination, paginatedResult, type PaginationQuery } from '../utils/common';

const roundMoney = (value: number) => Math.round(value * 100) / 100;

export interface GenerateRunInput {
  periodStart: string;
  periodEnd: string;
  notes?: string;
  currency?: string;
}

/** A payslip reference that is stable to read out over the phone. */
const payslipNumber = (periodEnd: string, index: number) =>
  `PS-${periodEnd.slice(0, 7).replace('-', '')}-${String(index + 1).padStart(4, '0')}`;

/**
 * Generates one payroll run.
 *
 * A run is a real object, not scattered rows: it carries the period, status and
 * totals, so a batch can be approved, paid or reversed as a unit. Overlapping
 * periods are refused unless the previous run was reversed, which is what
 * prevents paying somebody twice for November.
 *
 * A run has exactly one currency. Adding rupees to dollars produces a total
 * that means nothing, so a member paid in another currency rejects the run
 * before anything is written.
 */
export const generateRun = async (input: GenerateRunInput, actorId?: string) => {
  if (!isDayKey(input.periodStart) || !isDayKey(input.periodEnd)) {
    throw new AppError('Provide the pay period as YYYY-MM-DD', StatusCode.BAD_REQUEST);
  }
  if (input.periodEnd < input.periodStart) {
    throw new AppError('The pay period end must be after its start', StatusCode.BAD_REQUEST);
  }

  const settings = await organizationStatutorySettings();
  const runCurrency = input.currency?.trim().toUpperCase() || settings.currency;

  if (!/^[A-Z]{3}$/.test(runCurrency)) {
    throw new AppError('The run currency must be a three-letter ISO code', StatusCode.BAD_REQUEST);
  }

  const holidays = await holidayServices.holidayKeysBetween(input.periodStart, input.periodEnd);
  const workingDayOptions = { workingDays: settings.workingDays, holidays };
  const periodDays = workingDaysBetween(input.periodStart, input.periodEnd, workingDayOptions);
  if (periodDays === 0) {
    throw new AppError('That pay period contains no working days', StatusCode.BAD_REQUEST);
  }

  const overlapping = await payrollRunModel.findOne(
    tenantFilter({
      status: { $ne: 'reversed' },
      periodStart: { $lte: input.periodEnd },
      periodEnd: { $gte: input.periodStart },
    }),
  );
  if (overlapping) {
    throw new AppError(
      `A payroll run already covers part of this period (${overlapping.periodStart} → ${overlapping.periodEnd}). Reverse it first if it was wrong.`,
      StatusCode.CONFLICT,
    );
  }

  // Leavers are inactive by the time the run is generated, but a person whose
  // exit falls inside the period is still owed the days they worked.
  const employees = await employeeModel.find(
    tenantFilter({
      $or: [
        { isActive: true },
        { exitDate: { $gte: startOfDay(input.periodStart), $lt: endOfDay(input.periodEnd) } },
      ],
    }),
  );

  // One query for the period's approved unpaid leave, grouped per employee,
  // rather than a query per person.
  const leaveRows = await leaveRequestModel
    .find(
      tenantFilter({
        leaveStatus: 'approved',
        fromDate: { $lte: endOfDay(input.periodEnd) },
        toDate: { $gte: startOfDay(input.periodStart) },
      }),
    )
    .select('employeeId leaveType fromDate toDate')
    .lean();

  const unpaidByEmployee = new Map<string, UnpaidLeaveLike[]>();
  for (const row of leaveRows as unknown as (UnpaidLeaveLike & { employeeId: unknown })[]) {
    const key = String(row.employeeId);
    const list = unpaidByEmployee.get(key) ?? [];
    list.push(row);
    unpaidByEmployee.set(key, list);
  }

  const priced: {
    employeeId: mongoose.Types.ObjectId;
    baseSalary: number;
    deductions: { type: string; amount: number; note?: string }[];
    netPay: number;
  }[] = [];
  let skipped = 0;

  for (const employee of employees) {
    const employeeId = employee._id.toString();
    const salary = await compensationServices.salaryEffectiveOn(employeeId, input.periodEnd);
    if (!salary || salary <= 0) {
      skipped += 1;
      continue;
    }

    // An employee with no compensation row is paid in the organisation currency.
    const currency = (await compensationServices.currencyFor(employeeId)) ?? runCurrency;
    if (currency !== runCurrency) {
      throw new AppError(
        `This run is in ${runCurrency}, but ${employee.name} (${employee.employeeCode ?? employee._id}) is paid in ${currency}. One run cannot mix currencies.`,
        StatusCode.BAD_REQUEST,
      );
    }

    // Joiners earn from their joining date and leavers up to their exit date;
    // paying either a full month is the usual way payroll overpays.
    const proration = proratedSalary(
      salary,
      input.periodStart,
      input.periodEnd,
      employee.joiningDate,
      employee.exitDate,
      workingDayOptions,
    );
    if (proration.payableDays === 0) {
      skipped += 1;
      continue;
    }

    const baseSalary = roundMoney(proration.amount);
    const unpaidDays = unpaidLeaveDays(
      unpaidByEmployee.get(employeeId) ?? [],
      input.periodStart,
      input.periodEnd,
      workingDayOptions,
    );
    const unpaidAmount = roundMoney(Math.min(dayRate(baseSalary, proration.payableDays) * unpaidDays, baseSalary));

    const taxablePay = roundMoney(baseSalary - unpaidAmount);
    const statutory = statutoryDeductions(taxablePay, settings);

    const deductions = [
      ...(unpaidAmount > 0
        ? [
            {
              type: 'Unpaid leave',
              amount: unpaidAmount,
              note: `${unpaidDays} day${unpaidDays === 1 ? '' : 's'} without pay`,
            },
          ]
        : []),
      ...statutory.deductions,
    ];
    const totalDeductions = roundMoney(deductions.reduce((total, item) => total + item.amount, 0));

    priced.push({
      employeeId: employee._id,
      baseSalary,
      deductions,
      netPay: roundMoney(Math.max(baseSalary - totalDeductions, 0)),
    });
  }

  // Every rejection above happens before the run exists, so a refused run leaves
  // no draft behind for somebody to reverse.
  const totalNetPay = roundMoney(priced.reduce((total, item) => total + item.netPay, 0));

  const run = await payrollRunModel.create({
    ...tenantFields(),
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    status: 'draft',
    employeeCount: priced.length,
    totalNetPay,
    currency: runCurrency,
    ...(input.notes ? { notes: input.notes } : {}),
    ...(actorId ? { createdBy: actorId } : {}),
  });

  const records = priced.map((item, index) => ({
    ...tenantFields(),
    employeeId: item.employeeId,
    payRunId: run._id,
    payslipNumber: payslipNumber(input.periodEnd, index),
    baseSalary: item.baseSalary,
    currency: runCurrency,
    allowances: [],
    deductions: item.deductions,
    bonuses: [],
    netPay: item.netPay,
    payPeriodStart: startOfDay(input.periodStart),
    payPeriodEnd: startOfDay(input.periodEnd),
    paymentMethod: 'bank transfer' as const,
    status: 'pending' as const,
  }));

  if (records.length > 0) {
    await payrollModel.insertMany(records);

    notificationServices.notifySafely(
      notificationServices.notifyUsersWithAction('read_Payroll', {
        title: `Payroll draft ready for ${records.length} employee${records.length === 1 ? '' : 's'}`,
        detail: `${input.periodStart} → ${input.periodEnd} · ${runCurrency}. Review and approve the run.`,
        href: '/payroll',
        kind: 'payroll',
      }),
    );
  }

  return { run, created: records.length, skipped };
};

export const listRuns = async (query: PaginationQuery & { status?: string }) => {
  const { page, limit, skip } = getPagination(query);
  const filter: Record<string, unknown> = tenantFilter();
  if (query.status) filter.status = query.status;

  const [runs, total] = await Promise.all([
    payrollRunModel.find(filter).sort({ periodStart: -1 }).skip(skip).limit(limit),
    payrollRunModel.countDocuments(filter),
  ]);
  return paginatedResult(runs, total, page, limit);
};

export const getRun = async (runId: string) => {
  const run = await payrollRunModel.findOne(tenantFilter({ _id: runId }));
  if (!run) throw new AppError('Payroll run not found', StatusCode.NOT_FOUND);

  const records = await payrollModel
    .find(tenantFilter({ payRunId: run._id }))
    .populate('employeeId', 'name email employeeCode position')
    .sort({ createdAt: 1 });

  return { run, records };
};

const requireStatus = (status: string, allowed: string[]) => {
  if (!allowed.includes(status)) {
    throw new AppError(
      `That action is not available while the run is ${status}. Allowed from: ${allowed.join(', ')}.`,
      StatusCode.CONFLICT,
    );
  }
};

export const approveRun = async (runId: string, actorId?: string) => {
  const run = await payrollRunModel.findOne(tenantFilter({ _id: runId }));
  if (!run) throw new AppError('Payroll run not found', StatusCode.NOT_FOUND);
  requireStatus(run.status, ['draft']);

  run.status = 'approved';
  run.approvedAt = new Date();
  if (actorId) run.approvedBy = new mongoose.Types.ObjectId(actorId);
  await run.save();

  notificationServices.notifySafely(
    notificationServices.notifyUsersWithAction('read_Payroll', {
      title: `Payroll approved for ${run.periodStart} → ${run.periodEnd}`,
      detail: 'Mark it paid once the bank transfer clears.',
      href: '/payroll',
      kind: 'payroll',
    }),
  );

  return run;
};

/**
 * Tells each paid employee their payslip is ready.
 *
 * Only people with an active login get mail: a former employee whose account was
 * revoked at offboarding must not receive a salary message, and the address on
 * the employee record is not proof that a mailbox still exists.
 */
const notifyRunPaid = async (runId: mongoose.Types.ObjectId) => {
  try {
    const records = await payrollModel
      .find({ payRunId: runId })
      .populate('employeeId', 'name email userId')
      .lean();

    const userIds = records
      .map((record) => {
        const employee = record.employeeId as unknown as { userId?: unknown } | null;
        return employee?.userId ? String(employee.userId) : null;
      })
      .filter((id): id is string => Boolean(id));

    if (userIds.length === 0) return;

    const activeUsers = await userModel
      .find({ _id: { $in: userIds }, isActive: true })
      .select('_id')
      .lean();
    const active = new Set(activeUsers.map((user) => String(user._id)));

    for (const record of records) {
      const employee = record.employeeId as unknown as
        | { _id?: unknown; name?: string; email?: string; userId?: unknown }
        | null;
      if (!employee?.userId || !active.has(String(employee.userId))) continue;

      notifyPayslipCompleted({
        payPeriodStart: record.payPeriodStart,
        payPeriodEnd: record.payPeriodEnd,
        ...(record.currency ? { currency: record.currency } : {}),
        employeeId: employee,
      });
    }
  } catch (error) {
    console.error('[payroll] payslip notifications failed:', (error as Error)?.message);
  }
};

export const markRunPaid = async (runId: string) => {
  const run = await payrollRunModel.findOne(tenantFilter({ _id: runId }));
  if (!run) throw new AppError('Payroll run not found', StatusCode.NOT_FOUND);
  requireStatus(run.status, ['approved']);

  run.status = 'paid';
  run.paidAt = new Date();
  await run.save();

  await payrollModel.updateMany(
    tenantFilter({ payRunId: run._id }),
    { $set: { status: 'completed', datePaid: new Date() } },
  );

  // Fire-and-forget: a mail outage must not fail the payment record.
  void notifyRunPaid(run._id);

  return run;
};

export const reverseRun = async (runId: string, reason: string) => {
  const run = await payrollRunModel.findOne(tenantFilter({ _id: runId }));
  if (!run) throw new AppError('Payroll run not found', StatusCode.NOT_FOUND);
  requireStatus(run.status, ['draft', 'approved', 'paid']);
  if (!reason?.trim()) throw new AppError('A reversal needs a reason', StatusCode.BAD_REQUEST);

  run.status = 'reversed';
  run.reversedAt = new Date();
  run.reversalReason = reason.trim();
  await run.save();

  await payrollModel.updateMany(
    tenantFilter({ payRunId: run._id }),
    { $set: { status: 'reversed' } },
  );

  notificationServices.notifySafely(
    notificationServices.notifyUsersWithAction('read_Payroll', {
      title: `Payroll reversed for ${run.periodStart} → ${run.periodEnd}`,
      detail: reason.trim(),
      href: '/payroll',
      kind: 'payroll',
    }),
  );

  return run;
};

/** Bank/accounting export for one run, so payment does not need the screen. */
export const runCsv = async (runId: string): Promise<{ filename: string; csv: string }> => {
  const { run, records } = await getRun(runId);

  const header = [
    'Payslip',
    'Employee code',
    'Employee',
    'Email',
    'Base salary',
    'Deductions',
    'Net pay',
    'Currency',
    'Period start',
    'Period end',
    'Status',
  ];
  const rows = records.map((record) => {
    const employee = record.employeeId as unknown as { name?: string; email?: string; employeeCode?: string } | null;
    const deductions = (record.deductions ?? []).reduce((total, item) => total + (item.amount ?? 0), 0);
    return [
      record.payslipNumber ?? '',
      employee?.employeeCode ?? '',
      employee?.name ?? '',
      employee?.email ?? '',
      record.baseSalary,
      Math.round(deductions * 100) / 100,
      record.netPay,
      record.currency ?? run.currency,
      run.periodStart,
      run.periodEnd,
      record.status,
    ];
  });

  return {
    filename: `payroll-${run.periodStart}-to-${run.periodEnd}.csv`,
    csv: toCsv([header, ...rows]),
  };
};

export default {
  generateRun,
  listRuns,
  getRun,
  approveRun,
  markRunPaid,
  reverseRun,
  runCsv,
};

// Re-exported for callers that want "today" as the default period end.
export const defaultPeriod = () => ({ periodStart: `${todayKey().slice(0, 7)}-01`, periodEnd: todayKey(), endOfDay });
