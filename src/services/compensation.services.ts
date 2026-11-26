import compensationModel from '../models/compensation.model';
import employeeModel from '../models/employee.model';
import { AppError } from '../utils/helper/AppError';
import { StatusCode } from '../utils/helper/constants/enum';
import { tenantFields, tenantFilter } from '../utils/context';
import { isDayKey, todayKey } from '../utils/dates';
import { organizationCurrency } from './organizationSetting.services';
import { roundMoney } from '../utils/money';

export interface CompensationInput {
  employeeId: string;
  baseSalary: number;
  currency?: string;
  effectiveFrom?: string;
  reason?: 'initial' | 'raise' | 'promotion' | 'adjustment' | 'correction';
  note?: string;
}

/**
 * Records a compensation change. `Employee.salary` stays as the current figure
 * (payroll and the directory read it), while every change keeps its own
 * effective-dated row, so history survives the next raise.
 */
export const recordCompensation = async (input: CompensationInput, actorId?: string) => {
  const employee = await employeeModel.findOne(tenantFilter({ _id: input.employeeId }));
  if (!employee) throw new AppError('Employee not found', StatusCode.NOT_FOUND);
  if (!Number.isFinite(input.baseSalary) || input.baseSalary < 0) {
    throw new AppError('Salary must be a positive amount', StatusCode.BAD_REQUEST);
  }

  const effectiveFrom = input.effectiveFrom ?? todayKey();
  if (!isDayKey(effectiveFrom)) {
    throw new AppError('Effective date must use YYYY-MM-DD', StatusCode.BAD_REQUEST);
  }

  const record = await compensationModel.create({
    ...tenantFields(),
    employeeId: employee._id,
    baseSalary: roundMoney(input.baseSalary),
    // The organisation has one payroll currency; a compensation row inherits it
    // unless the caller states one explicitly.
    currency: (input.currency ?? (await organizationCurrency())).toUpperCase(),
    effectiveFrom,
    reason: input.reason ?? 'adjustment',
    ...(input.note ? { note: input.note } : {}),
    ...(actorId ? { createdBy: actorId } : {}),
  });

  // A future-dated raise must not change today's salary yet.
  if (effectiveFrom <= todayKey()) {
    employee.salary = roundMoney(input.baseSalary);
    await employee.save();
  }

  return record;
};

export const listCompensation = async (employeeId: string) =>
  compensationModel
    .find(tenantFilter({ employeeId }))
    .sort({ effectiveFrom: -1, createdAt: -1 });

/** The rate in force on a calendar day, falling back to the employee record. */
export const salaryEffectiveOn = async (employeeId: string, day: string): Promise<number | undefined> => {
  const record = await compensationModel
    .findOne(tenantFilter({ employeeId, effectiveFrom: { $lte: day } }))
    .sort({ effectiveFrom: -1, createdAt: -1 });

  if (record) return record.baseSalary;

  const employee = await employeeModel.findOne(tenantFilter({ _id: employeeId })).select('salary');
  return employee?.salary;
};

/** The currency on the employee's latest compensation row, when one exists. */
export const currencyFor = async (employeeId: string): Promise<string | undefined> => {
  const record = await compensationModel
    .findOne(tenantFilter({ employeeId }))
    .sort({ effectiveFrom: -1 });
  return record?.currency;
};

export interface EffectiveRate {
  baseSalary: number;
  currency?: string;
}

/**
 * The rate in force on a day for many employees at once.
 *
 * Payroll used two queries per employee (salary, then currency); at a few hundred
 * employees that is hundreds of round trips for one run. This resolves the whole
 * batch in two queries and lets pricing happen in memory. The employee record is
 * only a fallback for people who have no compensation history yet.
 */
export const ratesEffectiveOn = async (
  employeeIds: string[],
  day: string,
): Promise<Map<string, EffectiveRate>> => {
  const ids = [...new Set(employeeIds.filter((id) => Boolean(id)))];
  const rates = new Map<string, EffectiveRate>();
  if (ids.length === 0) return rates;

  const [rows, employees] = await Promise.all([
    compensationModel
      .find(tenantFilter({ employeeId: { $in: ids }, effectiveFrom: { $lte: day } }))
      .sort({ effectiveFrom: 1, createdAt: 1 })
      .lean(),
    employeeModel.find(tenantFilter({ _id: { $in: ids } })).select('salary').lean(),
  ]);

  // Ascending order means the last row per employee is the effective one.
  for (const row of rows as unknown as { employeeId: unknown; baseSalary: number; currency?: string }[]) {
    rates.set(String(row.employeeId), {
      baseSalary: row.baseSalary,
      ...(row.currency ? { currency: row.currency } : {}),
    });
  }

  const salaryById = new Map(
    (employees as unknown as { _id: unknown; salary?: number }[]).map((employee) => [
      String(employee._id),
      employee.salary,
    ]),
  );
  for (const id of ids) {
    if (rates.has(id)) continue;
    const fallback = salaryById.get(id);
    if (fallback !== undefined) rates.set(id, { baseSalary: fallback });
  }

  return rates;
};

export default {
  recordCompensation,
  listCompensation,
  salaryEffectiveOn,
  currencyFor,
  ratesEffectiveOn,
};
