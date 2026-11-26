import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { runWithContext } from '../utils/context';
import employeeServices from '../services/employee.services';
import employeeModel from '../models/employee.model';
import userModel from '../models/user.model';
import roleModel from '../models/role.model';
import departmentModel from '../models/department.model';
import compensationModel from '../models/compensation.model';
import organizationSettingModel from '../models/organizationSetting.model';
import jobLockModel from '../models/jobLock.model';
import { withJobLock } from '../utils/jobLock';
import { addDays, todayKey } from '../utils/dates';

/**
 * Offboarding has to happen because the calendar moved, not because somebody
 * opened the record and saved it again. These tests run the sweep the same way
 * the scheduler does: once per organisation, through the tenant context.
 */
jest.setTimeout(180_000);

let mongo: MongoMemoryServer;
let orgId: string;
let roleId: mongoose.Types.ObjectId;
let departmentId: mongoose.Types.ObjectId;

const inOrg = <T>(callback: () => Promise<T>): Promise<T> =>
  runWithContext({ requestId: 'offboarding-test', organizationId: orgId }, callback);

const makeEmployee = async (overrides: Record<string, unknown> = {}) => {
  const suffix = new mongoose.Types.ObjectId().toString().slice(-6);
  const user = await userModel.create({
    organizationId: orgId,
    name: 'Leaver',
    email: `leaver-${suffix}@example.com`,
    password: 'hashed-not-used',
    roleId,
    isActive: true,
    tokenVersion: 3,
    inviteToken: 'stale-invite',
    inviteTokenExpires: new Date(Date.now() + 86_400_000),
  });
  const employee = await employeeModel.create({
    organizationId: orgId,
    userId: user._id,
    employeeCode: `EMP-${suffix}`,
    name: 'Leaver',
    email: user.email,
    departmentId,
    position: 'Analyst',
    employmentType: 'full-time',
    salary: 120000,
    joiningDate: new Date('2024-01-01'),
    isActive: true,
    ...overrides,
  });
  return { user, employee };
};

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri(), { dbName: 'hr-offboarding' });
  await Promise.all([
    employeeModel.init(),
    userModel.init(),
    roleModel.init(),
    departmentModel.init(),
    compensationModel.init(),
    organizationSettingModel.init(),
    jobLockModel.init(),
  ]);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

beforeEach(async () => {
  await Promise.all([
    employeeModel.deleteMany({}),
    userModel.deleteMany({}),
    roleModel.deleteMany({}),
    departmentModel.deleteMany({}),
    compensationModel.deleteMany({}),
    organizationSettingModel.deleteMany({}),
    jobLockModel.deleteMany({}),
  ]);

  orgId = new mongoose.Types.ObjectId().toString();
  await organizationSettingModel.create({
    _id: new mongoose.Types.ObjectId(orgId),
    organizationId: new mongoose.Types.ObjectId(orgId),
    organizationName: 'Offboarding Co',
    email: 'hr@example.com',
    workingDays: [1, 2, 3, 4, 5],
  });
  const role = await roleModel.create({ organizationId: orgId, roleName: 'Employee', actions: [] });
  roleId = role._id as mongoose.Types.ObjectId;
  const department = await departmentModel.create({ organizationId: orgId, name: `Team-${orgId.slice(-6)}` });
  departmentId = department._id as mongoose.Types.ObjectId;
});

describe('scheduled offboarding', () => {
  it('revokes access when the exit date arrives without an edit', async () => {
    const { user, employee } = await makeEmployee({ exitDate: new Date('2026-11-01') });

    const result = await employeeServices.runScheduledOffboarding(new Date('2026-11-02T12:00:00Z'));
    expect(result).toMatchObject({ employees: 1, logins: 1, organizations: 1 });

    const [employeeAfter, userAfter] = await Promise.all([
      employeeModel.findById(employee._id),
      userModel.findById(user._id).select('+inviteToken'),
    ]);
    expect(employeeAfter?.isActive).toBe(false);
    expect(userAfter?.isActive).toBe(false);
    expect(userAfter?.tokenVersion).toBe(4);
    expect(userAfter?.inviteToken).toBeUndefined();

    // Running again the next day must not revoke anything twice.
    const again = await employeeServices.runScheduledOffboarding(new Date('2026-11-03T12:00:00Z'));
    expect(again.employees).toBe(0);
  });

  it('leaves a future exit date alone', async () => {
    const { employee } = await makeEmployee({ exitDate: new Date('2026-12-31') });

    const result = await employeeServices.runScheduledOffboarding(new Date('2026-11-02T12:00:00Z'));
    expect(result.employees).toBe(0);
    expect((await employeeModel.findById(employee._id))?.isActive).toBe(true);
  });
});

describe('rehire', () => {
  it('reactivates the employee and login with a fresh invite', async () => {
    const { user, employee } = await makeEmployee({ exitDate: new Date('2026-10-31') });
    await employeeServices.runScheduledOffboarding(new Date('2026-11-01T12:00:00Z'));

    const joiningDate = addDays(todayKey(), 1);
    const result = await inOrg(() =>
      employeeServices.rehireEmployee(employee._id.toString(), {
        joiningDate,
        position: 'Senior Analyst',
        salary: 145000,
      }),
    );

    expect(result.employee.isActive).toBe(true);
    expect(result.employee.exitDate).toBeUndefined();
    expect(result.employee.position).toBe('Senior Analyst');
    expect(result.inviteLink).toContain('/accept-invite?token=');

    const userAfter = await userModel.findById(user._id).select('+inviteToken');
    expect(userAfter?.isActive).toBe(true);
    expect(userAfter?.inviteToken).toBeTruthy();
    expect(userAfter?.tokenVersion).toBeGreaterThan(4);

    const compensation = await compensationModel.findOne({ employeeId: employee._id });
    expect(compensation).toMatchObject({ baseSalary: 145000, reason: 'rehire', effectiveFrom: joiningDate });
  });

  it('refuses to rehire somebody who is still active', async () => {
    const { employee } = await makeEmployee();
    await expect(
      inOrg(() => employeeServices.rehireEmployee(employee._id.toString(), {})),
    ).rejects.toMatchObject({ statusCode: 409 });
  });
});

describe('job lease', () => {
  it('lets only one caller run a job until the first finishes', async () => {
    let release: (value: string) => void = () => undefined;
    const first = withJobLock('daily-job', () => new Promise<string>((resolve) => { release = resolve; }));
    await new Promise((resolve) => setTimeout(resolve, 20));

    await expect(withJobLock('daily-job', async () => 'second')).resolves.toBeNull();
    release('first');
    await expect(first).resolves.toBe('first');

    // Finishing releases the lease, so the next boot does not wait for the TTL.
    await expect(withJobLock('daily-job', async () => 'third')).resolves.toBe('third');
  });

  it('takes over an expired lease instead of staying stuck', async () => {
    await jobLockModel.create({
      name: 'expired-job',
      lockedBy: 'crashed-instance',
      lockedUntil: new Date(Date.now() - 60_000),
    });

    await expect(withJobLock('expired-job', async () => 'recovered')).resolves.toBe('recovered');
  });
});
