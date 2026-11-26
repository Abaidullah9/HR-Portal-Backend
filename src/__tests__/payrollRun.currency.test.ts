/**
 * One currency per run.
 *
 * A run total that adds rupees to dollars is not a total, so a member paid in a
 * different currency must reject the run *before* anything is written. These
 * tests pin both halves: the refusal leaves no draft behind, and an accepted
 * run stamps every record with the organisation's currency.
 *
 * Statutory deductions are switched off here so the assertions stay about
 * currency; the tax arithmetic has its own suite.
 */
jest.mock('../models/payrollRun.model', () => ({
  findOne: jest.fn(),
  create: jest.fn(),
}));

jest.mock('../models/employeePayroll.model', () => ({
  insertMany: jest.fn(),
  updateMany: jest.fn(),
}));

jest.mock('../models/employee.model', () => ({
  find: jest.fn(),
}));

jest.mock('../models/leaveRequest.model', () => ({
  find: jest.fn(),
}));

jest.mock('../models/user.model', () => ({
  find: jest.fn(),
}));

jest.mock('../services/compensation.services', () => ({
  __esModule: true,
  default: {
    salaryEffectiveOn: jest.fn(),
    currencyFor: jest.fn(),
  },
}));

jest.mock('../services/organizationSetting.services', () => {
  const organizationCurrency = jest.fn();
  const organizationStatutorySettings = jest.fn();
  return {
    __esModule: true,
    organizationCurrency,
    organizationStatutorySettings,
    default: { organizationCurrency, organizationStatutorySettings },
  };
});

jest.mock('../services/holiday.services', () => ({
  __esModule: true,
  default: { holidayKeysBetween: jest.fn() },
  holidayKeysBetween: jest.fn(),
}));

jest.mock('../services/notification.services', () => ({
  __esModule: true,
  default: { notifySafely: jest.fn(), notifyUsersWithAction: jest.fn() },
}));

import payrollRunServices from '../services/payrollRun.services';
import payrollRunModel from '../models/payrollRun.model';
import payrollModel from '../models/employeePayroll.model';
import employeeModel from '../models/employee.model';
import leaveRequestModel from '../models/leaveRequest.model';
import compensationServices from '../services/compensation.services';
import organizationSettingServices from '../services/organizationSetting.services';
import holidayServices from '../services/holiday.services';

const runModel = payrollRunModel as unknown as { findOne: jest.Mock; create: jest.Mock };
const payroll = payrollModel as unknown as { insertMany: jest.Mock; updateMany: jest.Mock };
const employees = employeeModel as unknown as { find: jest.Mock };
const leaveRequests = leaveRequestModel as unknown as { find: jest.Mock };
const compensation = compensationServices as unknown as {
  salaryEffectiveOn: jest.Mock;
  currencyFor: jest.Mock;
};
const settings = organizationSettingServices as unknown as {
  organizationCurrency: jest.Mock;
  organizationStatutorySettings: jest.Mock;
};
const holidays = holidayServices as unknown as { holidayKeysBetween: jest.Mock };

const employee = {
  _id: { toString: () => 'emp1' },
  name: 'Diana Employee',
  employeeCode: 'EMP-0002',
};

const run = { _id: 'run1' };

beforeEach(() => {
  jest.clearAllMocks();
  runModel.findOne.mockResolvedValue(null);
  runModel.create.mockResolvedValue(run);
  payroll.insertMany.mockResolvedValue([]);
  employees.find.mockResolvedValue([employee]);
  leaveRequests.find.mockReturnValue({
    select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
  });
  holidays.holidayKeysBetween.mockResolvedValue(new Set());
  settings.organizationCurrency.mockResolvedValue('PKR');
  settings.organizationStatutorySettings.mockResolvedValue({
    currency: 'PKR',
    workingDays: [1, 2, 3, 4, 5],
    taxEnabled: false,
    eobiEnabled: false,
    minimumWage: 37000,
    providentFundEmployeePercent: 0,
    providentFundEmployerPercent: 0,
  });
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
      expect.objectContaining({
        currency: 'PKR',
        netPay: 190000,
        payslipNumber: 'PS-202611-0001',
      }),
    ]);
    expect(runModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ employeeCount: 1, totalNetPay: 190000, currency: 'PKR' }),
    );
    expect(result.created).toBe(1);
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
