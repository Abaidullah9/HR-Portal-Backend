jest.mock('../models/employeePayroll.model', () => ({
  findById: jest.fn(),
  find: jest.fn(),
  countDocuments: jest.fn(),
  create: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
}));
jest.mock('../models/employee.model', () => ({
  findOne: jest.fn(),
}));

import payrollServices from '../services/employeePayroll.services';

describe('Payslips', () => {
  let payrollModel: any;
  let employeeModel: any;

  const record = {
    _id: { toString: () => 'pay1' },
    employeeId: { _id: { toString: () => 'emp1' }, name: 'Diana', employeeCode: 'EMP-2', position: 'Engineer' },
    baseSalary: 1000,
    allowances: [{ type: 'transport', amount: 100 }],
    bonuses: [{ type: 'festival', amount: 50 }],
    deductions: [{ type: 'tax', amount: 200 }],
    netPay: 999, // deliberately stale; the payslip derives its own figure
    payPeriodStart: new Date('2026-05-01'),
    payPeriodEnd: new Date('2026-05-31'),
    paymentMethod: 'bank transfer',
    status: 'completed',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    payrollModel = require('../models/employeePayroll.model');
    employeeModel = require('../models/employee.model');
  });

  it('derives gross and net pay from the line items', async () => {
    payrollModel.findById.mockReturnValue({
      populate: jest.fn().mockResolvedValue(record),
    });

    const payslip = await payrollServices.getPayslip('pay1');

    expect(payslip.grossPay).toBe(1150);
    expect(payslip.totalDeductions).toBe(200);
    expect(payslip.netPay).toBe(950);
    expect(payslip.earnings).toHaveLength(3);
    expect(payslip.employee.name).toBe('Diana');
  });

  it('resolves self-service payslips from the session user, not a client id', async () => {
    employeeModel.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: 'emp1' }),
    });
    let captured: any;
    const chain: any = {
      populate: jest.fn(),
      sort: jest.fn(),
      limit: jest.fn().mockResolvedValue([record]),
    };
    chain.populate.mockReturnValue(chain);
    chain.sort.mockReturnValue(chain);
    payrollModel.find.mockImplementation((filter: any) => {
      captured = filter;
      return chain;
    });

    const payslips = await payrollServices.getOwnPayslips('user-9');

    expect(captured).toEqual({ employeeId: 'emp1' });
    expect(payslips).toHaveLength(1);
    expect(payslips[0]!.netPay).toBe(950);
  });

  it('returns nothing for a staff account that has no employee profile', async () => {
    employeeModel.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue(null),
    });

    const payslips = await payrollServices.getOwnPayslips('user-admin');

    expect(payslips).toEqual([]);
    expect(payrollModel.find).not.toHaveBeenCalled();
  });
});
