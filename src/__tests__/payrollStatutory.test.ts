/**
 * Pakistani statutory payroll and proration.
 *
 * These numbers end up on a payslip and in a bank transfer, so the slab
 * boundaries and the joiner/leaver arithmetic are pinned rather than trusted.
 */
import {
  annualIncomeTax,
  monthlyIncomeTax,
  overlappingWorkingDays,
  proratedSalary,
  statutoryDeductions,
  unpaidLeaveDays,
} from '../utils/payrollStatutory';

describe('salaried income tax slabs', () => {
  it('is nil up to the exemption threshold', () => {
    expect(annualIncomeTax(0)).toBe(0);
    expect(annualIncomeTax(600000)).toBe(0);
  });

  it('matches the published tax at each slab boundary', () => {
    expect(annualIncomeTax(1200000)).toBe(6000);
    expect(annualIncomeTax(2200000)).toBe(116000);
    expect(annualIncomeTax(3200000)).toBe(346000);
    expect(annualIncomeTax(4100000)).toBe(616000);
  });

  it('applies the top marginal rate above the last slab', () => {
    expect(annualIncomeTax(4500000)).toBe(756000);
  });

  it('adds the high-earner surcharge above ten million', () => {
    // 616,000 + 35% of 7.9m = 3,381,000, plus 9% surcharge.
    expect(annualIncomeTax(12000000)).toBe(3685290);
  });

  it('converts the annual figure to a monthly withholding', () => {
    expect(monthlyIncomeTax(190000)).toBe(11200);
  });
});

describe('statutory deductions', () => {
  it('withholds income tax and EOBI on a normal salary', () => {
    const result = statutoryDeductions(190000);
    expect(result.incomeTax).toBe(11200);
    expect(result.eobi).toBe(370);
    expect(result.deductions.map((item) => item.type)).toEqual(['Income tax', 'EOBI']);
  });

  it('honours the organisation switches', () => {
    const result = statutoryDeductions(190000, {
      taxEnabled: false,
      eobiEnabled: false,
      minimumWage: 37000,
      providentFundEmployeePercent: 0,
      providentFundEmployerPercent: 0,
    });
    expect(result.deductions).toHaveLength(0);
  });

  it('adds the provident fund percentage of basic pay', () => {
    const result = statutoryDeductions(100000, {
      taxEnabled: false,
      eobiEnabled: false,
      minimumWage: 37000,
      providentFundEmployeePercent: 5,
      providentFundEmployerPercent: 5,
    });
    expect(result.providentFund).toBe(5000);
    expect(result.employerProvidentFund).toBe(5000);
  });

  it('does not tax money that was not earned', () => {
    const noPay = statutoryDeductions(0);
    expect(noPay.incomeTax).toBe(0);
  });
});

describe('proration', () => {
  // November 2026 has 21 weekdays; the 16th is a Monday.
  it('pays a full month when employed for the whole period', () => {
    const result = proratedSalary(100000, '2026-11-01', '2026-11-30');
    expect(result).toMatchObject({ amount: 100000, payableDays: 21, periodDays: 21, prorated: false });
  });

  it('pays a joiner from the joining date', () => {
    const result = proratedSalary(100000, '2026-11-01', '2026-11-30', '2026-11-16');
    expect(result.payableDays).toBe(11);
    expect(result.amount).toBe(52380.95);
    expect(result.prorated).toBe(true);
  });

  it('stops paying a leaver on the exit date', () => {
    const result = proratedSalary(100000, '2026-11-01', '2026-11-30', undefined, '2026-11-13');
    expect(result.payableDays).toBe(10);
    expect(result.amount).toBe(47619.05);
  });

  it('pays nothing when the employment does not touch the period', () => {
    const result = proratedSalary(100000, '2026-11-01', '2026-11-30', undefined, '2026-10-05');
    expect(result.amount).toBe(0);
    expect(result.payableDays).toBe(0);
  });
});

describe('unpaid leave', () => {
  it('counts only working days inside the pay period', () => {
    expect(overlappingWorkingDays('2026-11-10', '2026-11-12', '2026-11-01', '2026-11-30')).toBe(3);
    // The request spills outside the period; only the overlap is deducted.
    expect(overlappingWorkingDays('2026-10-28', '2026-11-03', '2026-11-01', '2026-11-30')).toBe(2);
  });

  it('ignores paid leave types', () => {
    const days = unpaidLeaveDays(
      [
        { leaveType: 'vacation', fromDate: '2026-11-10', toDate: '2026-11-12' },
        { leaveType: 'Unpaid', fromDate: '2026-11-17', toDate: '2026-11-18' },
      ],
      '2026-11-01',
      '2026-11-30',
    );
    expect(days).toBe(2);
  });
});
