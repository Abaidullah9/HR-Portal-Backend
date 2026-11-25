import mongoose from 'mongoose';
import payrollRunModel from '../models/payrollRun.model';
import payrollModel from '../models/employeePayroll.model';
import employeeModel from '../models/employee.model';
import compensationServices from './compensation.services';
import notificationServices from './notification.services';
import { organizationCurrency } from './organizationSetting.services';
import { AppError } from '../utils/helper/AppError';
import { StatusCode } from '../utils/helper/constants/enum';
import { tenantFields, tenantFilter } from '../utils/context';
import { endOfDay, isDayKey, startOfDay, todayKey } from '../utils/dates';
import { getPagination, paginatedResult, type PaginationQuery } from '../utils/common';

const roundMoney = (value: number) => Math.round(value * 100) / 100;

export interface GenerateRunInput {
  periodStart: string;
  periodEnd: string;
  notes?: string;
  currency?: string;
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
 */
export const generateRun = async (input: GenerateRunInput, actorId?: string) => {
  if (!isDayKey(input.periodStart) || !isDayKey(input.periodEnd)) {
    throw new AppError('Provide the pay period as YYYY-MM-DD', StatusCode.BAD_REQUEST);
  }
  if (input.periodEnd < input.periodStart) {
    throw new AppError('The pay period end must be after its start', StatusCode.BAD_REQUEST);
  }

  const runCurrency = input.currency?.trim().toUpperCase() || (await organizationCurrency());

  if (!/^[A-Z]{3}$/.test(runCurrency)) {
    throw new AppError('The run currency must be a three-letter ISO code', StatusCode.BAD_REQUEST);
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

  const employees = await employeeModel.find(tenantFilter({ isActive: true }));
  const priced: { employeeId: mongoose.Types.ObjectId; salary: number }[] = [];
  let skipped = 0;

  for (const employee of employees) {
    const salary = await compensationServices.salaryEffectiveOn(
      employee._id.toString(),
      input.periodEnd,
    );
    if (!salary || salary <= 0) {
      skipped += 1;
      continue;
    }

    // An employee with no compensation row is paid in the organisation currency.
    const currency = (await compensationServices.currencyFor(employee._id.toString())) ?? runCurrency;
    if (currency !== runCurrency) {
      throw new AppError(
        `This run is in ${runCurrency}, but ${employee.name} (${employee.employeeCode ?? employee._id}) is paid in ${currency}. One run cannot mix currencies.`,
        StatusCode.BAD_REQUEST,
      );
    }

    priced.push({ employeeId: employee._id, salary: roundMoney(salary) });
  }

  // Every rejection above happens before the run exists, so a refused run leaves
  // no draft behind for somebody to reverse.
  const totalNetPay = roundMoney(priced.reduce((total, item) => total + item.salary, 0));

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

  const records = priced.map(({ employeeId, salary }) => ({
    ...tenantFields(),
    employeeId,
    payRunId: run._id,
    baseSalary: salary,
    currency: runCurrency,
    allowances: [],
    deductions: [],
    bonuses: [],
    netPay: salary,
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
  const escape = (value: unknown) => {
    const text = value === null || value === undefined ? '' : String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };

  const header = ['Employee code', 'Employee', 'Email', 'Base salary', 'Net pay', 'Currency', 'Period start', 'Period end', 'Status'];
  const rows = records.map((record) => {
    const employee = record.employeeId as unknown as { name?: string; email?: string; employeeCode?: string } | null;
    return [
      employee?.employeeCode ?? '',
      employee?.name ?? '',
      employee?.email ?? '',
      record.baseSalary,
      record.netPay,
      record.currency ?? run.currency,
      run.periodStart,
      run.periodEnd,
      record.status,
    ];
  });

  return {
    filename: `payroll-${run.periodStart}-to-${run.periodEnd}.csv`,
    csv: [header, ...rows].map((row) => row.map(escape).join(',')).join('\n'),
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
