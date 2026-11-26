import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { runWithContext } from '../utils/context';
import payrollRunServices from '../services/payrollRun.services';
import payrollRunModel from '../models/payrollRun.model';
import payrollModel from '../models/employeePayroll.model';
import payrollSequenceModel from '../models/payrollSequence.model';
import employeeModel from '../models/employee.model';
import compensationModel from '../models/compensation.model';
import departmentModel from '../models/department.model';
import leaveRequestModel from '../models/leaveRequest.model';
import organizationSettingModel from '../models/organizationSetting.model';

/**
 * Payroll runs against a real MongoDB.
 *
 * The unit tests mock every model, which cannot prove that the unique indexes,
 * the atomic number counter or the reversal flow actually behave. These run the
 * services against mongodb-memory-server with request context, so tenancy and
 * real duplicate-key errors are exercised too.
 */
jest.setTimeout(180_000);

let mongo: MongoMemoryServer;
let orgId: string;
let departmentId: mongoose.Types.ObjectId;
const PERIOD = { periodStart: '2026-11-01', periodEnd: '2026-11-30' };

const inOrg = <T>(callback: () => Promise<T>): Promise<T> =>
  runWithContext({ requestId: 'integration-test', organizationId: orgId }, callback);

const makeEmployee = async (input: {
  code: string;
  name: string;
  salary: number;
  joiningDate: Date;
  currency?: string;
}) =>
  employeeModel.create({
    organizationId: orgId,
    userId: new mongoose.Types.ObjectId(),
    employeeCode: input.code,
    name: input.name,
    email: `${input.code.toLowerCase()}@example.com`,
    departmentId,
    position: 'Engineer',
    employmentType: 'full-time',
    salary: input.salary,
    joiningDate: input.joiningDate,
    isActive: true,
  });

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri(), { dbName: 'hr-payroll-integration' });
  await Promise.all([
    payrollRunModel.init(),
    payrollModel.init(),
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
    payrollModel.deleteMany({}),
    payrollRunModel.deleteMany({}),
    payrollSequenceModel.deleteMany({}),
    leaveRequestModel.deleteMany({}),
    compensationModel.deleteMany({}),
    employeeModel.deleteMany({}),
    departmentModel.deleteMany({}),
    organizationSettingModel.deleteMany({}),
  ]);

  orgId = new mongoose.Types.ObjectId().toString();
  const settings = await organizationSettingModel.create({
    _id: new mongoose.Types.ObjectId(orgId),
    organizationId: new mongoose.Types.ObjectId(orgId),
    organizationName: 'Integration Co',
    email: 'payroll@example.com',
    workingDays: [1, 2, 3, 4, 5],
    currency: 'PKR',
    taxEnabled: true,
    eobiEnabled: true,
    minimumWage: 37000,
    providentFundEmployeePercent: 0,
    providentFundEmployerPercent: 0,
  });
  // The document id doubles as the tenant id in the seed, so keep that shape.
  expect(settings.organizationId?.toString()).toBe(orgId);

  const department = await departmentModel.create({ name: `Engineering-${orgId.slice(-6)}` });
  departmentId = department._id as mongoose.Types.ObjectId;
});

describe('payroll run lifecycle against MongoDB', () => {
  it('issues unique payslip numbers at approval and leaves them alone after reversal', async () => {
    const employees = await Promise.all([
      makeEmployee({ code: 'EMP-100', name: 'Ayesha Khan', salary: 190000, joiningDate: new Date('2025-01-01') }),
      makeEmployee({ code: 'EMP-101', name: 'Bilal Ahmed', salary: 60000, joiningDate: new Date('2025-01-01') }),
    ]);
    await compensationModel.insertMany(
      employees.map((employee) => ({
        organizationId: orgId,
        employeeId: employee._id,
        baseSalary: employee.salary,
        currency: 'PKR',
        effectiveFrom: '2026-01-01',
        reason: 'initial',
      })),
    );

    const generated = await inOrg(() => payrollRunServices.generateRun(PERIOD));
    expect(generated.run.status).toBe('draft');
    expect(generated.run.employeeCount).toBe(2);

    const drafts = await inOrg(() => payrollModel.find({ payRunId: generated.run._id }).lean());
    expect(drafts).toHaveLength(2);
    expect(drafts.every((record) => !record.payslipNumber)).toBe(true);

    const approved = await inOrg(() => payrollRunServices.approveRun(generated.run._id.toString()));
    expect(approved?.status).toBe('approved');

    const issued = await inOrg(() => payrollModel.find({ payRunId: generated.run._id }).lean());
    const firstNumbers = issued.map((record) => record.payslipNumber).sort();
    expect(firstNumbers).toEqual(['PS-202611-0001', 'PS-202611-0002']);

    // A second approval attempt is refused; the numbers are already permanent.
    await expect(
      inOrg(() => payrollRunServices.approveRun(generated.run._id.toString())),
    ).rejects.toMatchObject({ statusCode: 409 });

    const paid = await inOrg(() => payrollRunServices.markRunPaid(generated.run._id.toString()));
    expect(paid?.status).toBe('paid');

    const reversed = await inOrg(() =>
      payrollRunServices.reverseRun(generated.run._id.toString(), 'Bank file was rejected'),
    );
    expect(reversed?.status).toBe('reversed');

    const reversedSlips = await inOrg(() => payrollModel.find({ payRunId: generated.run._id }).lean());
    expect(reversedSlips.every((record) => record.status === 'reversed')).toBe(true);
    expect(reversedSlips.map((record) => record.payslipNumber).sort()).toEqual(firstNumbers);

    // The same period can be generated again after reversal...
    const regenerated = await inOrg(() => payrollRunServices.generateRun(PERIOD));
    expect(regenerated.run._id.toString()).not.toBe(generated.run._id.toString());
    await inOrg(() => payrollRunServices.approveRun(regenerated.run._id.toString()));

    const secondSlips = await inOrg(() => payrollModel.find({ payRunId: regenerated.run._id }).lean());
    const secondNumbers = secondSlips.map((record) => record.payslipNumber).sort();
    // ...and gets fresh references instead of colliding with the reversed ones.
    expect(secondNumbers).toEqual(['PS-202611-0003', 'PS-202611-0004']);

    const allNumbers = await inOrg(() => payrollModel.distinct('payslipNumber'));
    expect(new Set(allNumbers).size).toBe(4);
  });

  it('replays a retried create instead of making a second run', async () => {
    const employee = await makeEmployee({
      code: 'EMP-200',
      name: 'Sana Malik',
      salary: 120000,
      joiningDate: new Date('2025-01-01'),
    });
    await compensationModel.create({
      organizationId: orgId,
      employeeId: employee._id,
      baseSalary: 120000,
      currency: 'PKR',
      effectiveFrom: '2026-01-01',
      reason: 'initial',
    });

    const key = 'november-run-2026';
    const first = await inOrg(() => payrollRunServices.generateRun({ ...PERIOD, idempotencyKey: key }));
    const second = await inOrg(() => payrollRunServices.generateRun({ ...PERIOD, idempotencyKey: key }));

    expect(second.replayed).toBe(true);
    expect(second.run._id.toString()).toBe(first.run._id.toString());
    await expect(payrollRunModel.countDocuments({})).resolves.toBe(1);

    // A keyless retry still hits the overlap guard: there is a draft in the way.
    await expect(inOrg(() => payrollRunServices.generateRun(PERIOD))).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  it('prorates income tax from the contractual salary for a mid-month joiner', async () => {
    const joiner = await makeEmployee({
      code: 'EMP-300',
      name: 'Hamza Raza',
      salary: 190000,
      joiningDate: new Date('2026-11-16'),
    });
    await compensationModel.create({
      organizationId: orgId,
      employeeId: joiner._id,
      baseSalary: 190000,
      currency: 'PKR',
      effectiveFrom: '2026-01-01',
      reason: 'initial',
    });

    const generated = await inOrg(() => payrollRunServices.generateRun(PERIOD));
    const [record] = await inOrg(() => payrollModel.find({ payRunId: generated.run._id }).lean());
    expect(record).toBeDefined();

    // 11 of November's 21 working days are paid.
    expect(record!.baseSalary).toBeCloseTo(99523.81, 2);
    const incomeTax = record!.deductions.find((item) => item.type === 'Income tax');
    // Annualising the prorated 99,523.81 instead of the 190,000 contract would
    // compute a year below the taxable threshold and withhold nothing.
    expect(incomeTax?.amount).toBeCloseTo(5866.67, 2);
    expect(record!.netPay).toBeCloseTo(99523.81 - 5866.67 - 193.81, 2);
  });

  it('ignores unpaid leave recorded before the employee joined', async () => {
    const employee = await makeEmployee({
      code: 'EMP-400',
      name: 'Nadia Iqbal',
      salary: 120000,
      joiningDate: new Date('2026-11-10'),
    });
    await compensationModel.create({
      organizationId: orgId,
      employeeId: employee._id,
      baseSalary: 120000,
      currency: 'PKR',
      effectiveFrom: '2026-01-01',
      reason: 'initial',
    });
    await leaveRequestModel.create({
      organizationId: orgId,
      employeeId: employee._id,
      leaveType: 'unpaid',
      fromDate: new Date('2026-11-02'),
      toDate: new Date('2026-11-06'),
      leaveStatus: 'approved',
      reasonForLeave: 'Personal',
    });

    const generated = await inOrg(() => payrollRunServices.generateRun(PERIOD));
    const [record] = await inOrg(() => payrollModel.find({ payRunId: generated.run._id }).lean());
    // The base is already prorated from 10 November, so deducting pre-joining
    // leave on top would charge the same days twice.
    expect(record!.deductions.some((item) => item.type === 'Unpaid leave')).toBe(false);
  });

  it('refuses to generate a run overlapping a live one', async () => {
    const employee = await makeEmployee({
      code: 'EMP-500',
      name: 'Usman Tariq',
      salary: 80000,
      joiningDate: new Date('2025-01-01'),
    });
    await compensationModel.create({ organizationId: orgId, employeeId: employee._id, baseSalary: 80000, currency: 'PKR', effectiveFrom: '2026-01-01', reason: 'initial' });

    await inOrg(() => payrollRunServices.generateRun(PERIOD));
    await expect(
      inOrg(() =>
        payrollRunServices.generateRun({ periodStart: '2026-11-15', periodEnd: '2026-12-15' }),
      ),
    ).rejects.toMatchObject({ statusCode: 409 });
  });
});
