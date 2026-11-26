import { dayKey, workingDaysBetween, type WorkingDayOptions } from './dates';

/**
 * Pakistani salaried-income payroll rules.
 *
 * Kept as pure functions so the money can be checked without a database. The
 * slabs are the salaried filer schedule for tax year 2026 (income earned
 * 1 July 2025 – 30 June 2026). When the Finance Act changes them, only this
 * table moves.
 */
export interface TaxSlab {
  /** Upper bound of the band; null for the open-ended top band. */
  ceiling: number | null;
  /** Marginal rate applied inside the band. */
  rate: number;
}

export const SALARIED_TAX_SLABS: TaxSlab[] = [
  { ceiling: 600_000, rate: 0 },
  { ceiling: 1_200_000, rate: 0.01 },
  { ceiling: 2_200_000, rate: 0.11 },
  { ceiling: 3_200_000, rate: 0.23 },
  { ceiling: 4_100_000, rate: 0.3 },
  { ceiling: null, rate: 0.35 },
];

/** Salary above this carries the 9% high-earner surcharge. */
export const SURCHARGE_THRESHOLD = 10_000_000;
export const SURCHARGE_RATE = 0.09;

/** EOBI employee contribution, as a share of the minimum wage. */
export const EOBI_EMPLOYEE_RATE = 0.01;
/** EOBI employer contribution, as a share of the minimum wage. */
export const EOBI_EMPLOYER_RATE = 0.05;

export const DEFAULT_MINIMUM_WAGE = 37_000;

const roundMoney = (value: number) => Math.round(value * 100) / 100;

/** Annual income tax for a salaried person, before any credits. */
export const annualIncomeTax = (annualSalary: number): number => {
  if (!Number.isFinite(annualSalary) || annualSalary <= 0) return 0;

  let previousCeiling = 0;
  let previousTax = 0;

  for (const slab of SALARIED_TAX_SLABS) {
    const upper = slab.ceiling ?? Number.POSITIVE_INFINITY;
    if (annualSalary <= upper) {
      const tax = previousTax + (annualSalary - previousCeiling) * slab.rate;
      const surcharge = annualSalary > SURCHARGE_THRESHOLD ? tax * SURCHARGE_RATE : 0;
      return Math.round(tax + surcharge);
    }
    previousTax += (upper - previousCeiling) * slab.rate;
    previousCeiling = upper;
  }

  return 0;
};

/** The monthly withholding for a monthly taxable salary. */
export const monthlyIncomeTax = (monthlyTaxable: number): number =>
  roundMoney(annualIncomeTax(monthlyTaxable * 12) / 12);

export interface StatutorySettings {
  taxEnabled: boolean;
  eobiEnabled: boolean;
  minimumWage: number;
  providentFundEmployeePercent: number;
  providentFundEmployerPercent: number;
}

export const DEFAULT_STATUTORY_SETTINGS: StatutorySettings = {
  taxEnabled: true,
  eobiEnabled: true,
  minimumWage: DEFAULT_MINIMUM_WAGE,
  providentFundEmployeePercent: 0,
  providentFundEmployerPercent: 0,
};

export interface Deduction {
  type: string;
  amount: number;
  note?: string;
}

export interface StatutoryBreakdown {
  deductions: Deduction[];
  incomeTax: number;
  eobi: number;
  providentFund: number;
  employerProvidentFund: number;
}

export interface PeriodStatutoryInput {
  /**
   * The employee's full contractual monthly salary. Tax is annualised from this,
   * never from the prorated amount actually paid this period.
   */
  contractualMonthly: number;
  /** Taxable pay earned in this period, after joining/exit proration and unpaid leave. */
  taxablePay: number;
}

/**
 * Statutory deductions for one pay period.
 *
 * Income tax is progressive, so annualising a half-month payment under-withholds:
 * a joiner paid one week is not on a low salary, they are on their annual salary
 * for one week. The withholding is therefore computed from the contractual
 * monthly salary and then prorated by the share of the month actually paid.
 *
 * EOBI is a flat monthly contribution on the minimum wage; the same share rule
 * applies, so a five-day joiner is not charged a full month's contribution.
 * Provident fund is a percentage of what was actually earned.
 *
 * "Share of the month" is taxablePay / contractualMonthly: with day-rate
 * proration this equals paid working days / period working days.
 */
export const statutoryDeductionsForPeriod = (
  input: PeriodStatutoryInput,
  settings: StatutorySettings = DEFAULT_STATUTORY_SETTINGS,
): StatutoryBreakdown => {
  const deductions: Deduction[] = [];
  const contractual = Math.max(roundMoney(input.contractualMonthly), 0);
  const taxable = Math.max(roundMoney(input.taxablePay), 0);
  const fraction =
    contractual > 0 ? Math.min(1, Math.max(0, taxable / contractual)) : taxable > 0 ? 1 : 0;

  const incomeTax =
    settings.taxEnabled && fraction > 0 ? roundMoney(monthlyIncomeTax(contractual) * fraction) : 0;
  if (incomeTax > 0) {
    deductions.push({ type: 'Income tax', amount: incomeTax, note: 'Monthly withholding (salaried slabs)' });
  }

  const wage = settings.minimumWage > 0 ? settings.minimumWage : DEFAULT_MINIMUM_WAGE;
  const eobi = settings.eobiEnabled ? roundMoney(wage * EOBI_EMPLOYEE_RATE * fraction) : 0;
  if (eobi > 0) {
    deductions.push({
      type: 'EOBI',
      amount: eobi,
      note: fraction < 1 ? 'Employee contribution (prorated)' : 'Employee contribution',
    });
  }

  const pfPercent = settings.providentFundEmployeePercent;
  const providentFund = pfPercent > 0 ? roundMoney((taxable * pfPercent) / 100) : 0;
  if (providentFund > 0) {
    deductions.push({
      type: 'Provident fund',
      amount: providentFund,
      note: `${pfPercent}% employee contribution`,
    });
  }

  const employerProvidentFund =
    settings.providentFundEmployerPercent > 0
      ? roundMoney((taxable * settings.providentFundEmployerPercent) / 100)
      : 0;

  return { deductions, incomeTax, eobi, providentFund, employerProvidentFund };
};

/**
 * Statutory deductions for a full month. Kept for callers that hold only the
 * monthly taxable figure; a partial month must use
 * `statutoryDeductionsForPeriod` so the tax is annualised correctly.
 */
export const statutoryDeductions = (
  monthlyTaxable: number,
  settings: StatutorySettings = DEFAULT_STATUTORY_SETTINGS,
): StatutoryBreakdown =>
  statutoryDeductionsForPeriod(
    { contractualMonthly: monthlyTaxable, taxablePay: monthlyTaxable },
    settings,
  );

export interface Proration {
  /** Money payable for the period after joining/exit proration. */
  amount: number;
  payableDays: number;
  periodDays: number;
  /** True when the employee joined or left inside the period. */
  prorated: boolean;
}

/**
 * Prorates a monthly salary over the working days the person was actually
 * employed. A joiner on the 16th earns the second half of the month, and a
 * leaver stops earning on their exit date; paying either a full month is the
 * usual way payroll overpays.
 */
export const proratedSalary = (
  monthlySalary: number,
  periodStart: string,
  periodEnd: string,
  joiningDate: Date | string | undefined,
  exitDate: Date | string | undefined,
  options: WorkingDayOptions = {},
): Proration => {
  const periodDays = workingDaysBetween(periodStart, periodEnd, options);
  if (periodDays <= 0 || !Number.isFinite(monthlySalary) || monthlySalary <= 0) {
    return { amount: 0, payableDays: 0, periodDays, prorated: false };
  }

  const joined = joiningDate ? dayKey(new Date(joiningDate)) : periodStart;
  const left = exitDate ? dayKey(new Date(exitDate)) : periodEnd;

  const from = joined > periodStart ? joined : periodStart;
  const to = left < periodEnd ? left : periodEnd;
  const payableDays = from <= to ? workingDaysBetween(from, to, options) : 0;
  const prorated = from !== periodStart || to !== periodEnd;

  return {
    amount: roundMoney((monthlySalary * payableDays) / periodDays),
    payableDays,
    periodDays,
    prorated,
  };
};

/** Working days two inclusive ranges share, used for unpaid-leave deduction. */
export const overlappingWorkingDays = (
  from: string,
  to: string,
  periodStart: string,
  periodEnd: string,
  options: WorkingDayOptions = {},
): number => {
  const start = from > periodStart ? from : periodStart;
  const end = to < periodEnd ? to : periodEnd;
  if (start > end) return 0;
  return workingDaysBetween(start, end, options);
};

/** Leave types that carry no pay; matching is case-insensitive. */
export const UNPAID_LEAVE_TYPES = ['unpaid', 'unpaid leave', 'leave without pay', 'lwp'];

export const isUnpaidLeaveType = (leaveType: string): boolean =>
  UNPAID_LEAVE_TYPES.includes(leaveType.trim().toLowerCase());

export interface UnpaidLeaveLike {
  leaveType: string;
  fromDate: Date | string;
  toDate: Date | string;
}

/** Unpaid days inside the pay period across approved requests. */
export const unpaidLeaveDays = (
  requests: UnpaidLeaveLike[],
  periodStart: string,
  periodEnd: string,
  options: WorkingDayOptions = {},
): number =>
  requests
    .filter((request) => isUnpaidLeaveType(request.leaveType))
    .reduce(
      (total, request) =>
        total +
        overlappingWorkingDays(
          dayKey(new Date(request.fromDate)),
          dayKey(new Date(request.toDate)),
          periodStart,
          periodEnd,
          options,
        ),
      0,
    );

export const dayRate = (monthlySalary: number, periodDays: number): number =>
  periodDays > 0 ? monthlySalary / periodDays : 0;
