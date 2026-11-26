import { StatusCode } from '../utils/helper/constants/enum';
import { AppError } from '../utils/helper/AppError';
import employeeModel from '../models/employee.model';
import departmentModel from '../models/department.model';
import documentModel from '../models/document.model';
import leaveBalanceModel from '../models/leaveBalance.model';
import leaveRequestModel from '../models/leaveRequest.model';
import appraisalModel from '../models/appraisal.model';
import payrollModel from '../models/employeePayroll.model';
import checklistTaskModel from '../models/checklistTask.model';
import userModel from '../models/user.model';
import attendanceModel from '../models/attendance.model';
import goalModel from '../models/goal.model';
import { inviteUser, sendReactivationInvite } from './user.services';
import organizationSettingModel from '../models/organizationSetting.model';
import { CreateEmployeeDTO } from '../utils/dtos/employee.dto';
import { MESSAGES } from '../utils/helper/constants/messages';
import { getPagination, paginatedResult, PaginationQuery } from '../utils/common';
import { canAccessEmployee, type ReadScope } from '../utils/helper/ownership';
import { runWithOrganization, tenantFilter, tenantFields } from '../utils/context';
import { dayKey, endOfDay, isDayKey, todayKey } from '../utils/dates';
import { diffFields, type FieldChange } from '../utils/helper/audit';
import checklistServices from './checklist.services';
import compensationServices from './compensation.services';
import notificationServices from './notification.services';

const resolveOrganizationId = async (provided?: string): Promise<string> => {
  if (provided) return provided;
  const settings = await organizationSettingModel.findOne().select('_id').lean();
  if (!settings?._id) throw new AppError('Set up the organization before adding employees', StatusCode.BAD_REQUEST);
  return settings._id.toString();
};

const addEmployee = async (employeeData: CreateEmployeeDTO) => {
  if (!employeeData) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const organizationId = await resolveOrganizationId(employeeData.organizationId);

  // Adding a person and giving them a login are the same action from the
  // operator's point of view: create the invite when no user is supplied.
  let userId = employeeData.userId;
  let inviteLink: string | undefined;
  if (!userId) {
    const invite = await inviteUser(
      { name: employeeData.name, email: employeeData.email, roleName: 'Employee' },
      organizationId,
    );
    userId = invite.user._id.toString();
    inviteLink = invite.inviteLink;
  }

  const newEmployee = await employeeModel.create({
    ...employeeData,
    ...tenantFields(),
    organizationId,
    userId,
    joiningDate: new Date(employeeData.joiningDate),
  });

  if (inviteLink) {
    (newEmployee as unknown as Record<string, unknown>).inviteLink = inviteLink;
  }

  await checklistServices.startChecklist(newEmployee._id.toString(), 'onboarding', todayKey());

  if (newEmployee.salary && newEmployee.salary > 0) {
    await compensationServices.recordCompensation({
      employeeId: newEmployee._id.toString(),
      baseSalary: newEmployee.salary,
      effectiveFrom: todayKey(),
      reason: 'initial',
    });
  }

  return newEmployee;
};

const getAllEmployee = async (
  query: PaginationQuery & { search?: string; sort?: string; order?: string; departmentId?: string },
) => {
  const { page, limit, skip } = getPagination(query);

  // Server-side search so paging and filtering agree: a client-side filter over
  // one page would hide matches on the pages that were never fetched.
  const filter: Record<string, unknown> = tenantFilter();
  const search = typeof query.search === 'string' ? query.search.trim() : '';
  if (search) {
    const pattern = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [
      { name: pattern },
      { email: pattern },
      { employeeCode: pattern },
      { position: pattern },
    ];
  }
  if (typeof query.departmentId === 'string' && query.departmentId) {
    filter.departmentId = query.departmentId;
  }

  // Sorting happens in the database, so it covers the whole collection rather
  // than reordering the ten rows on the current page.
  const sortable: Record<string, string> = {
    name: 'name',
    employeeCode: 'employeeCode',
    position: 'position',
    joiningDate: 'joiningDate',
    isActive: 'isActive',
  };
  const sortField = sortable[query.sort ?? ''] ?? 'name';
  const sortDirection = query.order === 'desc' ? -1 : 1;

  const allEmployees = await employeeModel.find(filter)
    .populate('userId', 'name email')
    .populate('departmentId', 'name')
    .populate('reportingManagerId', 'name email')
    .sort({ [sortField]: sortDirection })
    .skip(skip)
    .limit(limit);
  const total = await employeeModel.countDocuments(filter);
  return paginatedResult(allEmployees, total, page, limit);
};

const getEmployeeById = async (_id: string) => {
  if (!_id) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const employeeById = await employeeModel.findOne(tenantFilter({ _id }))
    .populate('userId', 'name email')
    .populate('departmentId', 'name')
    .populate('reportingManagerId', 'name email');
  if (!employeeById) throw new AppError(MESSAGES.EMPLOYEE_NOT_FOUND, StatusCode.NOT_FOUND);
  return employeeById;
};

const getEmployeeByUserId = async (userId: string) => {
  if (!userId) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const employee = await employeeModel.findOne({ userId })
    .populate('departmentId', 'name')
    .populate('reportingManagerId', 'name email');
  if (!employee) throw new AppError(MESSAGES.EMPLOYEE_NOT_FOUND, StatusCode.NOT_FOUND);
  return employee;
};

const getEmployeesByDepartment = async (departmentId: string) => {
  if (!departmentId) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const employees = await employeeModel.find({ departmentId })
    .populate('userId', 'name email')
    .populate('reportingManagerId', 'name email');
  if (!employees) throw new AppError(MESSAGES.EMPLOYEE_NOT_FOUND, StatusCode.NOT_FOUND);
  return employees;
};

const getEmployeesByReportingManager = async (managerId: string) => {
  if (!managerId) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const employees = await employeeModel.find({ reportingManagerId: managerId })
    .populate('userId', 'name email')
    .populate('departmentId', 'name');
  if (!employees) throw new AppError(MESSAGES.EMPLOYEE_NOT_FOUND, StatusCode.NOT_FOUND);
  return employees;
};

const getActiveEmployees = async () => {
  const employees = await employeeModel.find(tenantFilter({ isActive: true }))
    .populate('userId', 'name email')
    .populate('departmentId', 'name');
  if (!employees) throw new AppError(MESSAGES.EMPLOYEE_NOT_FOUND, StatusCode.NOT_FOUND);
  return employees;
};

/**
 * Offboarding revokes access, not just the roster flag.
 *
 * A leaver whose login stays active can still read payroll, documents and
 * colleagues' data. Bumping `tokenVersion` also kills a session they already
 * have open, and clearing any pending invite/reset token closes the way back in.
 */
const revokeOffboardedAccess = async (userId: unknown, employeeId: string) => {
  const tasks: Promise<unknown>[] = [
    employeeModel.updateOne({ _id: employeeId }, { $set: { isActive: false } }),
  ];
  if (userId) {
    tasks.push(
      userModel.updateOne(
        { _id: userId },
        {
          $set: { isActive: false },
          $inc: { tokenVersion: 1 },
          $unset: { inviteToken: 1, inviteTokenExpires: 1, resetToken: 1, resetTokenExpires: 1 },
        },
      ),
    );
  }
  await Promise.all(tasks);
};

const updateEmployee = async (
  _id: string,
  updateData: Partial<CreateEmployeeDTO>,
  onChanges?: (changes: FieldChange[]) => void,
) => {
  if (!_id) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const before = await employeeModel.findOne(tenantFilter({ _id })).lean();
  if (!before) throw new AppError(MESSAGES.EMPLOYEE_NOT_FOUND, StatusCode.NOT_FOUND);

  const updatedEmployee = await employeeModel.findOneAndUpdate(tenantFilter({ _id }), updateData, { returnDocument: 'after' })
    .populate('userId', 'name email')
    .populate('departmentId', 'name')
    .populate('reportingManagerId', 'name email');
  if (!updatedEmployee) throw new AppError(MESSAGES.EMPLOYEE_NOT_FOUND, StatusCode.NOT_FOUND);

  // Setting an exit date is the moment offboarding starts; doing it here means
  // it cannot be forgotten when the update comes from any client.
  if (updateData.exitDate && !before.exitDate) {
    await checklistServices.startChecklist(_id, 'offboarding', todayKey());
    notificationServices.notifySafely(
      notificationServices.notifyUsersWithAction('update_Employee', {
        title: `${updatedEmployee.name} is leaving`,
        detail: 'The offboarding checklist has been created.',
        href: `/employees/${_id}`,
        kind: 'employee',
      }),
    );
  }

  // A future exit date is a plan, not an offboarding: access is cut on the day.
  const exitDate = updatedEmployee.exitDate;
  if (exitDate && dayKey(new Date(exitDate)) <= todayKey()) {
    await revokeOffboardedAccess(before.userId, _id);
    updatedEmployee.isActive = false;
  }

  if (onChanges) {
    const after = updatedEmployee.toObject() as unknown as Record<string, unknown>;
    onChanges(diffFields(before as unknown as Record<string, unknown>, after, Object.keys(updateData)));
  }

  return updatedEmployee;
};

/** Fields an HR operator can change while bringing somebody back. */
export interface RehireInput {
  joiningDate?: string;
  position?: string;
  departmentId?: string;
  salary?: number;
}

/**
 * Brings a leaver back without inventing a second employee record.
 *
 * The employee and login already exist, so rehire clears the exit date,
 * reactivates both, invalidates every old session and sends a fresh invite: the
 * person chooses a new password rather than inheriting whatever they had before
 * they left.
 */
const rehireEmployee = async (
  _id: string,
  input: RehireInput,
  onChanges?: (changes: FieldChange[]) => void,
) => {
  const before = await employeeModel.findOne(tenantFilter({ _id })).lean();
  if (!before) throw new AppError(MESSAGES.EMPLOYEE_NOT_FOUND, StatusCode.NOT_FOUND);
  if (before.isActive) throw new AppError(MESSAGES.EMPLOYEE_ALREADY_ACTIVE, StatusCode.CONFLICT);

  const joiningDate = input.joiningDate?.trim() || todayKey();
  if (!isDayKey(joiningDate)) {
    throw new AppError('Use YYYY-MM-DD for the new joining date', StatusCode.BAD_REQUEST);
  }
  const salary = input.salary === undefined ? undefined : Number(input.salary);
  if (salary !== undefined && (!Number.isFinite(salary) || salary < 0)) {
    throw new AppError(MESSAGES.PAYROLL_INVALID_AMOUNT, StatusCode.BAD_REQUEST);
  }

  const setFields: Record<string, unknown> = {
    isActive: true,
    joiningDate: new Date(`${joiningDate}T00:00:00.000Z`),
  };
  if (input.position?.trim()) setFields.position = input.position.trim();
  if (input.departmentId) setFields.departmentId = input.departmentId;
  if (salary !== undefined) setFields.salary = salary;

  const updated = await employeeModel
    .findOneAndUpdate(
      tenantFilter({ _id }),
      { $set: setFields, $unset: { exitDate: 1 } },
      { returnDocument: 'after' },
    )
    .populate('userId', 'name email isActive')
    .populate('departmentId', 'name');
  if (!updated) throw new AppError(MESSAGES.EMPLOYEE_NOT_FOUND, StatusCode.NOT_FOUND);

  let inviteLink: string | undefined;
  let delivered: boolean | undefined;

  if (before.userId) {
    const invite = await sendReactivationInvite(before.userId.toString());
    inviteLink = invite.inviteLink;
    delivered = invite.delivered;
  } else {
    // Legacy rows can predate the login; rehire creates the account it lacked.
    const invite = await inviteUser({ name: before.name, email: before.email, roleName: 'Employee' });
    await employeeModel.updateOne(tenantFilter({ _id }), { $set: { userId: invite.user._id } });
    updated.userId = invite.user as any;
    inviteLink = invite.inviteLink;
    delivered = invite.delivered;
  }

  if (salary !== undefined && salary > 0) {
    await compensationServices.recordCompensation({
      employeeId: _id,
      baseSalary: salary,
      effectiveFrom: joiningDate,
      reason: 'rehire',
    });
  }

  await checklistServices.startChecklist(_id, 'onboarding', joiningDate);

  if (onChanges) {
    onChanges(diffFields(before as unknown as Record<string, unknown>, updated.toObject() as unknown as Record<string, unknown>));
  }

  return {
    employee: updated,
    ...(inviteLink ? { inviteLink } : {}),
    ...(delivered !== undefined ? { delivered } : {}),
  };
};

/**
 * Daily offboarding sweep.
 *
 * Setting an exit date used to revoke access only if HR happened to save that
 * record again on or after the date. This closes that gap: every active employee
 * whose exit date has arrived loses their login, open sessions and pending
 * invite/reset tokens even when nobody edits the record.
 */
const completeDueOffboarding = async (now: Date = new Date()) => {
  const due = await employeeModel
    .find(tenantFilter({ isActive: true, exitDate: { $ne: null, $lt: endOfDay(dayKey(now)) } }))
    .select('_id userId');

  let logins = 0;
  for (const employee of due) {
    if (employee.userId) logins += 1;
    await revokeOffboardedAccess(employee.userId, employee._id.toString());
  }

  return { employees: due.length, logins };
};

/**
 * Scheduler entry point: runs the offboarding sweep once per organisation.
 *
 * Doing it per organisation means the sweep uses the same tenant-scoped query
 * as an HTTP request instead of an unscoped "all employees" update.
 */
const runScheduledOffboarding = async (now: Date = new Date()) => {
  const organizationIds: unknown[] = await employeeModel.distinct('organizationId', {
    organizationId: { $ne: null },
    isActive: true,
    exitDate: { $ne: null, $lt: endOfDay(dayKey(now)) },
  });

  let employees = 0;
  let logins = 0;
  for (const organizationId of organizationIds) {
    const result = await runWithOrganization(
      String(organizationId),
      () => completeDueOffboarding(now),
      'offboarding',
    );
    employees += result.employees;
    logins += result.logins;
  }

  return { employees, logins, organizations: organizationIds.length };
};

const deleteEmployee = async (_id: string) => {
  if (!_id) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  return employeeModel.findOneAndDelete(tenantFilter({ _id }));
};

/** Flat hierarchy data for the org chart; the tree is built in the client. */
const orgChart = async () => {
  const employees = await employeeModel
    .find(tenantFilter({ isActive: true }))
    .select('name email employeeCode position departmentId reportingManagerId')
    .populate('departmentId', 'name')
    .lean();

  return employees.map((employee) => ({
    id: employee._id.toString(),
    name: employee.name,
    email: employee.email,
    employeeCode: employee.employeeCode,
    position: employee.position,
    department:
      typeof employee.departmentId === 'object' && employee.departmentId !== null && 'name' in employee.departmentId
        ? (employee.departmentId as { name?: string }).name ?? 'General'
        : 'General',
    managerId: employee.reportingManagerId ? employee.reportingManagerId.toString() : null,
  }));
};

/**
 * The 360 view behind the employee profile page. One request returns everything
 * the page shows, so the sections cannot disagree about which employee they
 * loaded.
 */
const getEmployeeProfile = async (employeeId: string, scope: ReadScope) => {
  if (!employeeId) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);
  if (!canAccessEmployee(scope, employeeId)) {
    throw new AppError(MESSAGES.NOT_AUTHORIZED, StatusCode.FORBIDDEN);
  }

  const employee = await employeeModel.findOne(tenantFilter({ _id: employeeId }))
    .populate('userId', 'name email isActive lastLogin')
    .populate('departmentId', 'name')
    .populate('reportingManagerId', 'name email position');
  if (!employee) throw new AppError(MESSAGES.EMPLOYEE_NOT_FOUND, StatusCode.NOT_FOUND);

  const [
    documents,
    compensations,
    balances,
    leaveRequests,
    appraisals,
    payslips,
    tasks,
    directReports,
  ] = await Promise.all([
    documentModel.find(tenantFilter({ employeeId })).sort({ createdAt: -1 }).lean(),
    compensationServices.listCompensation(employeeId),
    leaveBalanceModel.find(tenantFilter({ employeeId })).sort({ year: -1 }).lean(),
    leaveRequestModel.find(tenantFilter({ employeeId })).sort({ fromDate: -1 }).limit(24).lean(),
    appraisalModel
      .find(tenantFilter({ employeeId }))
      .populate('cycleId', 'name')
      .populate('appraiserId', 'name')
      .sort({ reviewDate: -1 })
      .lean(),
    payrollModel.find(tenantFilter({ employeeId })).sort({ payPeriodStart: -1 }).limit(12).lean(),
    checklistTaskModel.find(tenantFilter({ employeeId })).sort({ dueDate: 1 }).lean(),
    employeeModel.find(tenantFilter({ reportingManagerId: employee._id })).select('name position employeeCode').lean(),
  ]);

  return {
    employee,
    documents,
    compensations,
    balances,
    leaveRequests,
    appraisals,
    payslips,
    tasks,
    directReports,
  };
};

/** GDPR access request: everything held about one person, as one JSON document. */
const exportEmployeeData = async (employeeId: string) => {
  const employee = await employeeModel.findOne(tenantFilter({ _id: employeeId })).lean();
  if (!employee) throw new AppError(MESSAGES.EMPLOYEE_NOT_FOUND, StatusCode.NOT_FOUND);

  const [user, documents, compensations, balances, leaveRequests, attendance, appraisals, payslips, tasks, goals] =
    await Promise.all([
      userModel.findById(employee.userId).select('name email roleId isActive lastLogin createdAt').lean(),
      documentModel.find({ employeeId }).select('-storageKey -fileUrl').lean(),
      compensationServices.listCompensation(employeeId),
      leaveBalanceModel.find({ employeeId }).lean(),
      leaveRequestModel.find({ employeeId }).lean(),
      attendanceModel.find({ employeeId }).lean(),
      appraisalModel.find({ employeeId }).lean(),
      payrollModel.find({ employeeId }).lean(),
      checklistTaskModel.find({ employeeId }).lean(),
      goalModel.find({ employeeId }).lean(),
    ]);

  return {
    exportedAt: new Date().toISOString(),
    subject: { employee, user },
    documents: documents.map((document) => ({
      name: document.name,
      type: document.type,
      uploadedAt: (document as unknown as { createdAt?: Date }).createdAt,
    })),
    compensations,
    leaveBalances: balances,
    leaveRequests,
    attendance,
    appraisals,
    payslips,
    checklistTasks: tasks,
    goals,
  };
};

/**
 * GDPR erasure without destroying the audit trail: identifying fields are
 * replaced, the login is disabled, and the payroll/audit history stays for the
 * statutory retention period.
 */
const anonymizeEmployee = async (employeeId: string, actorId?: string) => {
  const employee = await employeeModel.findOne(tenantFilter({ _id: employeeId }));
  if (!employee) throw new AppError(MESSAGES.EMPLOYEE_NOT_FOUND, StatusCode.NOT_FOUND);

  const suffix = employee._id.toString().slice(-6);
  employee.name = `Former employee ${suffix}`;
  employee.email = `removed-${suffix}@invalid.local`;
  employee.set('salary', undefined);
  employee.isActive = false;
  await employee.save();

  await userModel.updateOne(
    { _id: employee.userId },
    {
      $set: { name: employee.name, email: employee.email, isActive: false },
      $unset: { inviteToken: 1, inviteTokenExpires: 1, resetToken: 1, resetTokenExpires: 1 },
    },
  );

  await checklistTaskModel.updateMany({ employeeId }, { $set: { notes: 'Redacted on erasure request' } });

  notificationServices.notifySafely(
    notificationServices.notifyUsersWithAction('update_Employee', {
      title: 'Employee record erased',
      detail: `Identifying details were removed by ${actorId ?? 'an administrator'}. Payroll and audit history were retained.`,
      href: '/audit',
      kind: 'compliance',
    }),
  );

  return { employeeId, anonymizedAt: new Date().toISOString() };
};

export interface ImportEmployeeRow {
  name?: string;
  email?: string;
  employeeCode?: string;
  department?: string;
  departmentId?: string;
  position?: string;
  employmentType?: string;
  joiningDate?: string;
  salary?: number | string;
  managerEmail?: string;
}

const pickDepartmentId = async (row: ImportEmployeeRow): Promise<string> => {
  if (row.departmentId) return row.departmentId;
  const name = row.department?.trim();
  if (!name) throw new Error('Department is required');
  const existing = await departmentModel.findOne({ name });
  if (existing) return existing._id.toString();
  const created = await departmentModel.create({ name, description: `Created by employee import` });
  return created._id.toString();
};

/**
 * CSV/JSON import. Each row produces an invited user (never a shared password)
 * plus the employee record, and failures are returned per row instead of
 * aborting the whole file.
 */
const importEmployees = async (rows: ImportEmployeeRow[]) => {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new AppError('Provide at least one row to import', StatusCode.BAD_REQUEST);
  }
  if (rows.length > 500) {
    throw new AppError('Import at most 500 rows at a time', StatusCode.BAD_REQUEST);
  }

  const created: { employeeId: string; email: string; inviteLink?: string }[] = [];
  const failed: { row: number; email?: string; reason: string }[] = [];
  const organisationId = await resolveOrganizationId();
  let sequence = await employeeModel.countDocuments({ organizationId: organisationId });

  for (const [index, row] of rows.entries()) {
    try {
      const name = row.name?.trim();
      const email = row.email?.trim().toLowerCase();
      if (!name) throw new Error('Name is required');
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw new Error('A valid email is required');
      if (!row.position?.trim()) throw new Error('Position is required');

      const joiningDate = row.joiningDate && isDayKey(row.joiningDate) ? row.joiningDate : todayKey();
      const departmentId = await pickDepartmentId(row);
      const employmentType = ['full-time', 'contract', 'intern'].includes(row.employmentType ?? '')
        ? (row.employmentType as 'full-time' | 'contract' | 'intern')
        : 'full-time';

      const duplicate = await employeeModel.findOne({ email });
      if (duplicate) throw new Error('An employee with this email already exists');

      const existingUser = await userModel.findOne({ email });
      if (existingUser) throw new Error('A login already exists for this email');

      let employeeCode = row.employeeCode?.trim();
      if (!employeeCode) {
        sequence += 1;
        employeeCode = `EMP-${String(sequence).padStart(4, '0')}`;
      }

      const manager = row.managerEmail
        ? await employeeModel.findOne({ email: row.managerEmail.trim().toLowerCase() })
        : null;

      const invite = await inviteUser(
        { name, email, roleName: 'Employee' },
        organisationId,
      );

      const employee = await employeeModel.create({
        organizationId: organisationId,
        userId: invite.user._id,
        employeeCode,
        name,
        email,
        departmentId,
        position: row.position.trim(),
        employmentType,
        joiningDate: new Date(`${joiningDate}T00:00:00.000Z`),
        isActive: true,
        ...(manager ? { reportingManagerId: manager._id } : {}),
      });

      const salary = typeof row.salary === 'number' ? row.salary : Number(row.salary ?? 0);
      if (Number.isFinite(salary) && salary > 0) {
        employee.salary = salary;
        await employee.save();
        await compensationServices.recordCompensation({
          employeeId: employee._id.toString(),
          baseSalary: salary,
          effectiveFrom: joiningDate,
          reason: 'initial',
        });
      }

      await checklistServices.startChecklist(employee._id.toString(), 'onboarding', joiningDate);

      created.push({
        employeeId: employee._id.toString(),
        email,
        ...(invite.inviteLink ? { inviteLink: invite.inviteLink } : {}),
      });
    } catch (error) {
      failed.push({
        row: index + 1,
        ...(row.email ? { email: row.email } : {}),
        reason: (error as Error)?.message ?? 'Could not import this row',
      });
    }
  }

  return { created, failed, total: rows.length };
};

/** Direct reports for the signed-in manager, resolved from the session. */
const getTeamForUser = async (userId: string) => {
  const manager = await employeeModel.findOne({ userId }).select('_id');
  if (!manager) return [];
  return employeeModel
    .find({ reportingManagerId: manager._id })
    .populate('departmentId', 'name')
    .select('name email employeeCode position isActive departmentId joiningDate')
    .lean();
};

export default {
  addEmployee,
  getAllEmployee,
  getEmployeeById,
  getEmployeeByUserId,
  getEmployeesByDepartment,
  getEmployeesByReportingManager,
  getActiveEmployees,
  updateEmployee,
  rehireEmployee,
  completeDueOffboarding,
  runScheduledOffboarding,
  deleteEmployee,
  orgChart,
  getEmployeeProfile,
  exportEmployeeData,
  anonymizeEmployee,
  importEmployees,
  getTeamForUser,
};
