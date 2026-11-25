/**
 * One currency per run.
 *
 * A run total that adds rupees to dollars is not a total, so a member paid in a
 * different currency must reject the run *before* anything is written. These
 * tests pin both halves: the refusal leaves no draft behind, and an accepted
 * run stamps every record with the organisation's currency.
 */
jest.mock('../models/payrollRun.model', () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  find: jest.fn(),
  countDocuments: jest.fn(),
}));

jest.mock('../models/employeePayroll.model', () => ({
  insertMany: jest.fn(),
  find: jest.fn(),
  updateMany: jest.fn(),
}));

jest.mock('../models/employee.model', () => ({
  find: jest.fn(),
}));

jest.mock('../services/compensation.services', () => ({
  __esModule: true,
  default: {
    salaryEffectiveOn: jest.fn(),
    currencyFor: jest.fn(),
  },
}));

jest.mock('../services/organizationSetting.services', () => ({
  __esModule: true,
  default: { organizationCurrency: jest.fn() },
}));

jest.mock('../services/notification.services', () => ({
  __esModule: true,
  default: { notifySafely: jest.fn(), notifyUsersWithAction: jest.fn() },
}));

import payrollRunServices from '../services/payrollRun.services';
import payrollRunModel from '../models/payrollRun.model';
import payrollModel from '../models/employeePayroll.model';
import employeeModel from '../models/employee.model';
import compensationServices from '../services/compensation.services';
import organizationSettingServices from '../services/organizationSetting.services';

const runModel = payrollRunModel as unknown as { findOne: jest.Mock; create: jest.Mock };
const payroll = payrollModel as unknown as { insertMany: jest.Mock };
const employees = employeeModel as unknown as { find: jest.Mock };
const compensation = compensationServices as unknown as {
  salaryEffectiveOn: jest.Mock;
  currencyFor: jest.Mock;
};
const settings = organizationSettingServices as unknown as { organizationCurrency: jest.Mock };

const employee = {
  _id: { toString: () => 'emp1' },
  name: 'Diana Employee',
  employeeCode: 'EMP-0002',
};

const run = { _id: 'run1', employeeCount: 0, totalNetPay: 0, save: jest.fn() };

beforeEach(() => {
  jest.clearAllMocks();
  runModel.findOne.mockResolvedValue(null);
  runModel.create.mockResolvedValue(run);
  payroll.insertMany.mockResolvedValue([]);
  employees.find.mockResolvedValue([employee]);
  settings.organizationCurrency.mockResolvedValue('PKR');
});

describe('payroll run currency', () => {
  it('refuses a run that mixes currencies before writing anything', async () => {
    compensation.salaryEffectiveOn.mockResolvedValue(190000);
    compensation.currencyFor.mockResolvedValue('USD');

    await expect(
      payrollRunServices.generateRun({ periodStart: '2026-11-01', periodEnd: '2026-11-30' }),
    ).rejects.toMatchObject({ statusCode: 400 });

    expect(runModel.create).not.toHaveBeenCalled();
    expect(payroll.insertMany).not.toHaveBeenCalled();
  });

  it('stamps the organisation currency on the run and its records', async () => {
    compensation.salaryEffectiveOn.mockResolvedValue(190000);
    compensation.currencyFor.mockResolvedValue('PKR');

    const result = await payrollRunServices.generateRun({
      periodStart: '2026-11-01',
      periodEnd: '2026-11-30',
    });

    expect(runModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ currency: 'PKR', status: 'draft' }),
    );
    expect(payroll.insertMany).toHaveBeenCalledWith([
      expect.objectContaining({ currency: 'PKR', netPay: 190000 }),
    ]);
    expect(result.created).toBe(1);
    expect(run.totalNetPay).toBe(190000);
    expect(run.employeeCount).toBe(1);
  });

  it('honours an explicit run currency instead of the organisation default', async () => {
    compensation.salaryEffectiveOn.mockResolvedValue(1000);
    compensation.currencyFor.mockResolvedValue('AED');

    await payrollRunServices.generateRun({
      periodStart: '2026-11-01',
      periodEnd: '2026-11-30',
      currency: 'aed',
    });

    expect(runModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ currency: 'AED' }),
    );
  });
});
