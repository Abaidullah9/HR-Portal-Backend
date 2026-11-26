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
  statutoryDeductionsForPeriod,
  unpaidLeaveDays,
  type UnpaidLeaveLike,
} from '../utils/payrollStatutory';
import { dayKey, endOfDay, isDayKey, startOfDay, todayKey, workingDaysBetween } from '../utils/dates';
import { toCsv } from '../utils/csv';
import { getPagination, paginatedResult, type PaginationQuery } from '../utils/common';
import { roundMoney, sumMoney } from '../utils/money';
import { allocatePayslipNumbers } from './payslipSequence.services';

export interface GenerateRunInput {
  periodStart: string;
  periodEnd: string;
  notes?: string;
  currency?: string;
  /** Client-supplied key that makes a retried create resolve to the same run. */
  idempotencyKey?: string;
}

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
 *
 * Retrying the create with the same `idempotencyKey` returns the existing run:
 * a double-click must not create two overlapping drafts.
 */
export const generateRun = async (input: GenerateRunInput, actorId?: string) => {
  if (!isDayKey(input.periodStart) || !isDayKey(input.periodEnd)) {
    throw new AppError('Provide the pay period as YYYY-MM-DD', StatusCode.BAD_REQUEST);
  }
  if (input.periodEnd < input.periodStart) {
    throw new AppError('The pay period end must be after its start', StatusCode.BAD_REQUEST);
  }

  const idempotencyKey = input.idempotencyKey?.trim();
  if (idempotencyKey && idempotencyKey.length > 128) {
    throw new AppError('The idempotency key must be at most 128 characters', StatusCode.BAD_REQUEST);
  }
  if (idempotencyKey) {
    const existing = await payrollRunModel.findOne(tenantFilter({ idempotencyKey }));
    if (existing) return { run: existing, created: 0, skipped: 0, replayed: true };
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

  // Two queries for the whole batch instead of two per employee.
  const rates = await compensationServices.ratesEffectiveOn(
    employees.map((employee) => employee._id.toString()),
    input.periodEnd,
  );

  const priced: {
    employeeId: mongoose.Types.ObjectId;
    baseSalary: number;
    deductions: { type: string; amount: number; note?: string }[];
    netPay: number;
  }[] = [];
  let skipped = 0;

  for (const employee of employees) {
    const employeeId = employee._id.toString();
    const rate = rates.get(employeeId);
    const salary = rate?.baseSalary;
    if (!salary || salary <= 0) {
      skipped += 1;
      continue;
    }

    // An employee with no compensation row is paid in the organisation currency.
    const currency = rate?.currency ?? runCurrency;
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

    // Unpaid leave only counts inside the employment window: leave recorded
    // before joining (or after exit) must not deduct money from this run.
    const joinedOn = employee.joiningDate ? dayKey(employee.joiningDate) : input.periodStart;
    const leftOn = employee.exitDate ? dayKey(employee.exitDate) : input.periodEnd;
    const windowStart = joinedOn > input.periodStart ? joinedOn : input.periodStart;
    const windowEnd = leftOn < input.periodEnd ? leftOn : input.periodEnd;
    const unpaidDays =
      windowStart <= windowEnd
        ? unpaidLeaveDays(unpaidByEmployee.get(employeeId) ?? [], windowStart, windowEnd, workingDayOptions)
        : 0;
    const unpaidAmount = roundMoney(Math.min(dayRate(baseSalary, proration.payableDays) * unpaidDays, baseSalary));

    const taxablePay = roundMoney(baseSalary - unpaidAmount);
    // Tax is annualised from the contractual salary, then prorated to the money
    // actually paid; annualising the prorated figure would under-withhold.
    const statutory = statutoryDeductionsForPeriod(
      { contractualMonthly: salary, taxablePay },
      settings,
    );

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
    const totalDeductions = sumMoney(deductions.map((item) => item.amount));

    priced.push({
      employeeId: employee._id,
      baseSalary,
      deductions,
      netPay: roundMoney(Math.max(baseSalary - totalDeductions, 0)),
    });
  }

  // Every rejection above happens before the run exists, so a refused run leaves
  // no draft behind for somebody to reverse.
  const totalNetPay = sumMoney(priced.map((item) => item.netPay));

  let run;
  try {
    run = await payrollRunModel.create({
      ...tenantFields(),
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      status: 'draft',
      employeeCount: priced.length,
      totalNetPay,
      currency: runCurrency,
      ...(input.notes ? { notes: input.notes } : {}),
      ...(idempotencyKey ? { idempotencyKey } : {}),
      ...(actorId ? { createdBy: actorId } : {}),
    });
  } catch (error) {
    // Two concurrent requests with the same key: the loser reads the winner's run
    // instead of reporting a duplicate-key error to the user.
    if (idempotencyKey && (error as { code?: number })?.code === 11000) {
      const existing = await payrollRunModel.findOne(tenantFilter({ idempotencyKey }));
      if (existing) return { run: existing, created: 0, skipped: 0, replayed: true };
    }
    throw error;
  }

  const records = priced.map((item) => ({
    ...tenantFields(),
    employeeId: item.employeeId,
    payRunId: run._id,
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

  return { run, created: records.length, skipped, replayed: false };
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

/**
 * Gives every slip in a run its permanent reference, once.
 *
 * Draft records have no number because a draft may be deleted; numbers are
 * allocated when the run is issued (approved). A re-run after a reversal gets
 * fresh numbers from the counter, so it can never collide with the reversed
 * slips that still carry theirs.
 */
const assignPayslipNumbers = async (run: { _id: mongoose.Types.ObjectId; periodStart: string }) => {
  const missing = await payrollModel
    .find(
      tenantFilter({
        payRunId: run._id,
        $or: [{ payslipNumber: { $exists: false } }, { payslipNumber: null }],
      }),
    )
    .select('_id')
    .sort({ createdAt: 1 })
    .lean();
  if (missing.length === 0) return;

  const numbers = await allocatePayslipNumbers(run.periodStart.slice(0, 7), missing.length);
  const updates = missing.flatMap((record, index) => {
    const payslipNumber = numbers[index];
    return payslipNumber
      ? [{ updateOne: { filter: tenantFilter({ _id: record._id }), update: { $set: { payslipNumber } } } }]
      : [];
  });
  if (updates.length > 0) await payrollModel.bulkWrite(updates);
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

  // Allocation happens before the status change: if numbering fails, the run
  // stays a draft rather than becoming an approved run with unusable slips.
  await assignPayslipNumbers(run);

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
    // The caller already fetched the run under tenant scope; keep the invariant
    // here too so a future caller cannot leak another organisation's payslips.
    const records = await payrollModel
      .find(tenantFilter({ payRunId: runId }))
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
      .find(tenantFilter({ _id: { $in: userIds }, isActive: true }))
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

  // Runs approved before numbering moved to issue time have no references yet.
  await assignPayslipNumbers(run);

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
    const deductions = sumMoney((record.deductions ?? []).map((item) => item.amount ?? 0));
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

/** Lightweight read used by audit entries before and after a transition. */
export const getRunStatus = async (runId: string) => {
  const run = await payrollRunModel
    .findOne(tenantFilter({ _id: runId }))
    .select('status periodStart periodEnd employeeCount totalNetPay currency');
  if (!run) throw new AppError('Payroll run not found', StatusCode.NOT_FOUND);
  return run;
};

export default {
  generateRun,
  listRuns,
  getRun,
  getRunStatus,
  approveRun,
  markRunPaid,
  reverseRun,
  runCsv,
};

// Re-exported for callers that want "today" as the default period end.
export const defaultPeriod = () => ({ periodStart: `${todayKey().slice(0, 7)}-01`, periodEnd: todayKey(), endOfDay });
