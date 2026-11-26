import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { runWithContext } from '../utils/context';
import employeePayrollServices from '../services/employeePayroll.services';
import payrollRunServices from '../services/payrollRun.services';
import employeePayrollModel from '../models/employeePayroll.model';
import payrollRunModel from '../models/payrollRun.model';
import payrollSequenceModel from '../models/payrollSequence.model';
import employeeModel from '../models/employee.model';
import compensationModel from '../models/compensation.model';
import departmentModel from '../models/department.model';
import leaveRequestModel from '../models/leaveRequest.model';
import organizationSettingModel from '../models/organizationSetting.model';

/**
 * Manual payroll records against a real MongoDB.
 *
 * The point of these is that totals are computed by the server, statutory
 * deductions cannot be silently omitted, and a paid record can no longer be
 * edited or deleted through the CRUD routes.
 */
jest.setTimeout(180_000);

let mongo: MongoMemoryServer;
let orgId: string;
let employeeId: mongoose.Types.ObjectId;

const inOrg = <T>(callback: () => Promise<T>): Promise<T> =>
  runWithContext({ requestId: 'manual-payroll-test', organizationId: orgId }, callback);

const createPayload = (overrides: Record<string, unknown> = {}) => ({
  employeeId: employeeId.toString(),
  baseSalary: 190000,
  allowances: [],
  bonuses: [],
  deductions: [],
  payPeriodStart: new Date('2026-11-01'),
  payPeriodEnd: new Date('2026-11-30'),
  paymentMethod: 'bank transfer' as const,
  ...overrides,
});

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri(), { dbName: 'hr-manual-payroll' });
  await Promise.all([
    employeePayrollModel.init(),
    payrollRunModel.init(),
    payrollSequenceModel.init(),
    employeeModel.init(),
    compensationModel.init(),
    leaveRequestModel.init(),
    organizationSettingModel.init(),
    departmentModel.init(),
  ]);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

beforeEach(async () => {
  await Promise.all([
    employeePayrollModel.deleteMany({}),
    payrollRunModel.deleteMany({}),
    payrollSequenceModel.deleteMany({}),
    leaveRequestModel.deleteMany({}),
    compensationModel.deleteMany({}),
    employeeModel.deleteMany({}),
    departmentModel.deleteMany({}),
    organizationSettingModel.deleteMany({}),
  ]);

  orgId = new mongoose.Types.ObjectId().toString();
  await organizationSettingModel.create({
    _id: new mongoose.Types.ObjectId(orgId),
    organizationId: new mongoose.Types.ObjectId(orgId),
    organizationName: 'Manual Co',
    email: 'payroll@example.com',
    workingDays: [1, 2, 3, 4, 5],
    currency: 'PKR',
    taxEnabled: true,
    eobiEnabled: true,
    minimumWage: 37000,
    providentFundEmployeePercent: 0,
    providentFundEmployerPercent: 0,
  });

  const department = await departmentModel.create({ name: `Finance-${orgId.slice(-6)}` });
  const employee = await employeeModel.create({
    organizationId: orgId,
    userId: new mongoose.Types.ObjectId(),
    employeeCode: 'EMP-900',
    name: 'Manual Employee',
    email: 'manual@example.com',
    departmentId: department._id,
    position: 'Analyst',
    employmentType: 'full-time',
    salary: 190000,
    joiningDate: new Date('2025-01-01'),
    isActive: true,
  });
  employeeId = employee._id as mongoose.Types.ObjectId;
  await compensationModel.create({
    organizationId: orgId,
    employeeId,
    baseSalary: 190000,
    currency: 'PKR',
    effectiveFrom: '2026-01-01',
    reason: 'initial',
  });
});

describe('manual payroll records', () => {
  it('computes net pay and applies statutory deductions itself', async () => {
    const created = await inOrg(() => employeePayrollServices.addPayroll(createPayload()));

    expect(created.status).toBe('pending');
    // 190,000 - 11,200 income tax - 370 EOBI.
    expect(created.netPay).toBe(178430);
    expect(created.deductions?.map((line: { type: string }) => line.type)).toEqual([
      'Income tax',
      'EOBI',
    ]);
  });

  it('refuses a client-supplied net pay instead of trusting it', async () => {
    await expect(
      inOrg(() => employeePayrollServices.addPayroll(createPayload({ netPay: 1 }))),
    ).rejects.toMatchObject({ statusCode: 400 });
    await expect(employeePayrollModel.countDocuments({})).resolves.toBe(0);
  });

  it('requires a reason before accepting caller-computed statutory lines', async () => {
    await expect(
      inOrg(() =>
        employeePayrollServices.addPayroll(
          createPayload({ deductions: [{ type: 'Income tax', amount: 5000 }] }),
        ),
      ),
    ).rejects.toMatchObject({ statusCode: 400 });

    const overridden = await inOrg(() =>
      employeePayrollServices.addPayroll(
        createPayload({
          deductions: [{ type: 'Income tax', amount: 5000 }],
          overrideReason: 'Tax certificate received from the employee',
        }),
      ),
    );
    expect(overridden.netPay).toBe(185000);
  });

  it('recomputes totals when the salary changes', async () => {
    const created = await inOrg(() => employeePayrollServices.addPayroll(createPayload()));
    const updated = await inOrg(() =>
      employeePayrollServices.updatePayroll(created._id.toString(), { baseSalary: 95000 }),
    );

    expect(updated.baseSalary).toBe(95000);
    expect(updated.netPay).toBeLessThan(95000);
    expect(updated.deductions?.some((line: { type: string }) => line.type === 'Income tax')).toBe(true);
  });

  it('makes a completed record immutable and issues it a payslip number', async () => {
    const created = await inOrg(() => employeePayrollServices.addPayroll(createPayload()));
    const paid = await inOrg(() =>
      employeePayrollServices.updatePayrollStatus(created._id.toString(), 'completed'),
    );

    expect(paid.status).toBe('completed');
    expect(paid.datePaid).toBeTruthy();
    expect(paid.payslipNumber).toMatch(/^PS-202611-\d{4}$/);

    await expect(
      inOrg(() => employeePayrollServices.updatePayroll(created._id.toString(), { baseSalary: 1 })),
    ).rejects.toMatchObject({ statusCode: 409 });
    await expect(
      inOrg(() => employeePayrollServices.deletePayroll(created._id.toString())),
    ).rejects.toMatchObject({ statusCode: 409 });
    await expect(
      inOrg(() => employeePayrollServices.updatePayrollStatus(created._id.toString(), 'failed')),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('refuses to edit a record owned by a payroll run', async () => {
    const generated = await inOrg(() =>
      payrollRunServices.generateRun({ periodStart: '2026-11-01', periodEnd: '2026-11-30' }),
    );
    await inOrg(() => payrollRunServices.approveRun(generated.run._id.toString()));
    const record = await inOrg(() =>
      employeePayrollModel.findOne({ payRunId: generated.run._id }),
    );
    expect(record).toBeTruthy();

    await expect(
      inOrg(() => employeePayrollServices.updatePayroll(record!._id.toString(), { baseSalary: 1 })),
    ).rejects.toMatchObject({ statusCode: 409 });
    await expect(
      inOrg(() => employeePayrollServices.deletePayroll(record!._id.toString())),
    ).rejects.toMatchObject({ statusCode: 409 });
    await expect(
      inOrg(() => employeePayrollServices.updatePayrollStatus(record!._id.toString(), 'completed')),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('reports a payslip whose stored net pay does not match its lines', async () => {
    const created = await inOrg(() => employeePayrollServices.addPayroll(createPayload()));
    await inOrg(() =>
      employeePayrollModel.updateOne({ _id: created._id }, { $set: { netPay: 1 } }),
    );

    const payslip = await inOrg(() => employeePayrollServices.getPayslip(created._id.toString()));
    expect(payslip.netPay).toBe(1);
    expect(payslip.calculatedNetPay).toBe(178430);
    expect(payslip.reconciles).toBe(false);
  });
});
