import compensationModel from '../models/compensation.model';
import employeeModel from '../models/employee.model';
import { AppError } from '../utils/helper/AppError';
import { StatusCode } from '../utils/helper/constants/enum';
import { tenantFields, tenantFilter } from '../utils/context';
import { isDayKey, todayKey } from '../utils/dates';

export interface CompensationInput {
  employeeId: string;
  baseSalary: number;
  currency?: string;
  effectiveFrom?: string;
  reason?: 'initial' | 'raise' | 'promotion' | 'adjustment' | 'correction';
  note?: string;
}

const roundMoney = (value: number) => Math.round(value * 100) / 100;

/**
 * Records a compensation change. `Employee.salary` stays as the current figure
 * (payroll and the directory read it), while every change keeps its own
 * effective-dated row, so history survives the next raise.
 */
export const recordCompensation = async (input: CompensationInput, actorId?: string) => {
  const employee = await employeeModel.findById(input.employeeId);
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
    currency: input.currency ?? 'USD',
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

  const employee = await employeeModel.findById(employeeId).select('salary');
  return employee?.salary;
};

export const currencyFor = async (employeeId: string): Promise<string> => {
  const record = await compensationModel
    .findOne(tenantFilter({ employeeId }))
    .sort({ effectiveFrom: -1 });
  return record?.currency ?? 'USD';
};

export default {
  recordCompensation,
  listCompensation,
  salaryEffectiveOn,
  currencyFor,
};
