/**
 * Role-by-endpoint authorization matrix.
 *
 * The endpoint list is read from the route files and the role grants from the
 * seed, so the matrix cannot drift from the routes it describes: adding a route
 * without a guard, renaming an action, or changing a role's modules fails here.
 *
 * Three layers are covered:
 *   1. every route is reachable only by an authenticated caller with the action;
 *   2. each route × each seeded role is allowed or denied as the grants say;
 *   3. own-record vs other-record vs direct-report access via the read scope.
 */
import fs from 'fs';
import path from 'path';
import { NextFunction, Request, Response } from 'express';

jest.mock('../models/role.model', () => ({
  findById: jest.fn(),
}));

jest.mock('../models/user.model', () => ({
  findById: jest.fn(),
}));

jest.mock('../models/employee.model', () => ({
  findOne: jest.fn(),
  find: jest.fn(),
}));

import { authorize } from '../middlewares/authorize.middleware';
import { canAccessEmployee, resolveReadScope, scopeEmployeeFilter } from '../utils/helper/ownership';

const SRC = path.join(__dirname, '..');
const ROUTES_DIR = path.join(SRC, 'routes');

/** Where each router is mounted, mirroring routes/index.ts. */
const MOUNT: Record<string, string> = {
  'action.routes.ts': '/actions',
  'appraisal.routes.ts': '/appraisals',
  'attendance.routes.ts': '/attendance',
  'candidate.routes.ts': '/candidates',
  'checklist.routes.ts': '/checklists',
  'compensation.routes.ts': '/compensations',
  'department.routes.ts': '/departments',
  'document.routes.ts': '/documents',
  'employee.routes.ts': '/employees',
  'employeePayroll.routes.ts': '/payroll',
  'feedback.routes.ts': '/feedback',
  'goal.routes.ts': '/goals',
  'holiday.routes.ts': '/holidays',
  'hrInsights.routes.ts': '/',
  'interview.routes.ts': '/interviews',
  'jobPosting.routes.ts': '/job-postings',
  'leaveBalance.routes.ts': '/leave-balances',
  'leaveRequest.routes.ts': '/leave-requests',
  'notification.routes.ts': '/notifications',
  'organizationSetting.routes.ts': '/organization-settings',
  'performanceCycle.routes.ts': '/performance-cycles',
  'payrollRun.routes.ts': '/payroll-runs',
  'report.routes.ts': '/reports',
  'role.routes.ts': '/roles',
  'search.routes.ts': '/search',
  'team.routes.ts': '/teams',
  'user.routes.ts': '/users',
};

interface Endpoint {
  method: string;
  path: string;
  authenticated: boolean;
  action?: string;
  controller?: string;
  key: string;
}

const routeFiles = fs.readdirSync(ROUTES_DIR).filter((file) => file.endsWith('.routes.ts'));

const endpoints: Endpoint[] = routeFiles.flatMap((file) => {
  const mount = MOUNT[file] ?? '';
  const source = fs.readFileSync(path.join(ROUTES_DIR, file), 'utf8');
  const rows: Endpoint[] = [];

  for (const match of source.matchAll(/router\.(get|post|patch|put|delete)\(\s*['"]([^'"]+)['"]\s*,([^;]*)/g)) {
    const [, method, route, chain] = match;
    if (!method || !route || !chain) continue;

    const action = chain.match(/authorize\(\s*['"]([^'"]+)['"]\s*\)/)?.[1];
    const controller = chain.match(/(\w+Controller)\.(\w+)/)?.slice(1).join('.');
    const fullPath = `${mount}${route}`.replace('//', '/').replace(/\/$/, '') || '/';
    const upper = method.toUpperCase();

    rows.push({
      method: upper,
      path: fullPath,
      authenticated: chain.includes('isAuthenticated'),
      ...(action ? { action } : {}),
      ...(controller ? { controller } : {}),
      key: `${upper} ${fullPath}`,
    });
  }
  return rows;
});

/** Reachable without a session: credential entry points only. */
const PUBLIC_ROUTES = new Set([
  'POST /users/register',
  'POST /users/login',
  'POST /users/login/mfa',
  'POST /users/accept-invite',
  'POST /users/forgot-password',
  'POST /users/reset-password',
  'POST /users/logout',
]);

/**
 * Authenticated but not action-gated: these can only ever return data belonging
 * to the caller, because the handler reads req.userId rather than a parameter.
 * The dashboard is the exception — it is filtered per module inside the
 * service, so it needs a session but no single action.
 */
const SELF_SERVICE_ROUTES = new Set([
  'GET /users/me',
  'POST /users/change-password',
  'GET /notifications',
  'POST /notifications/read-all',
  'POST /notifications/:id/read',
  'GET /search',
  'GET /dashboard/summary',
  // Two-factor enrolment acts only on the caller's own account.
  'POST /users/mfa/setup',
  'POST /users/mfa/enable',
  'POST /users/mfa/disable',
]);

/** Action catalogue and role grants, read from the seed so they stay in step. */
const seedSource = fs.readFileSync(path.join(SRC, 'utils', 'seed.ts'), 'utf8');
const ACTION_CATALOGUE = [...seedSource.matchAll(/actionName:\s*['"]([^'"]+)['"]/g)]
  .map((match) => match[1]!)
  .filter((value, index, all) => all.indexOf(value) === index);

const moduleList = (name: string): string[] => {
  const block = seedSource.match(new RegExp(`const ${name} = \\[([^\\]]*)\\]`))?.[1] ?? '';
  return [...block.matchAll(/['"]([^'"]+)['"]/g)].map((match) => match[1]!);
};

const grantsByModule = (modules: string[]): string[] =>
  ACTION_CATALOGUE.filter((action) => modules.some((module) => action.endsWith(`_${module}`)));

// Every role also holds the self-service grants, which are named without a
// module suffix so the module-wide filters above never pick them up.
const selfServiceGrants = moduleList('selfServiceActions');

const ROLE_GRANTS: Record<string, string[]> = {
  Admin: [...ACTION_CATALOGUE],
  HR: [
    ...grantsByModule(moduleList('hrModules')),
    ...moduleList('hrExtraActions'),
    ...selfServiceGrants,
  ],
  Manager: [...grantsByModule(moduleList('managerModules')), ...selfServiceGrants],
  Employee: [
    ...grantsByModule(moduleList('employeeModules')).filter(
      (action) => action !== 'approveReject_LeaveRequest',
    ),
    ...selfServiceGrants,
  ],
};

const ROLE_NAMES = Object.keys(ROLE_GRANTS);

const roleModelMock = jest.requireMock('../models/role.model') as { findById: jest.Mock };

/** Runs the real authorize middleware as if the given role were signed in. */
const isAllowed = async (granted: string[], action: string): Promise<boolean> => {
  roleModelMock.findById.mockReturnValue({
    populate: jest.fn().mockResolvedValue({
      roleName: 'role-under-test',
      actions: granted.map((name) => ({ actionName: name })),
    }),
  });

  const next = jest.fn() as unknown as NextFunction;
  const res = {} as Response;
  await authorize(action)({ user: { roleId: 'role-1' } } as unknown as Request, res, next);

  const calls = (next as jest.Mock).mock.calls;
  // Denials are forwarded as next(error); an allow is next() with no argument.
  return calls.length > 0 && calls[0].length === 0;
};

describe('authorization matrix — route guards', () => {
  beforeEach(() => jest.clearAllMocks());

  it('knows where every router is mounted', () => {
    expect(routeFiles.sort()).toEqual(Object.keys(MOUNT).sort());
  });

  it('parses a route table instead of an empty one', () => {
    expect(endpoints.length).toBeGreaterThan(100);
  });

  it('registers every endpoint exactly once', () => {
    const counts = new Map<string, number>();
    for (const endpoint of endpoints) counts.set(endpoint.key, (counts.get(endpoint.key) ?? 0) + 1);
    const duplicates = [...counts].filter(([, count]) => count > 1).map(([key]) => key).sort();

    expect(duplicates).toEqual([]);
  });

  it('gates every own-record route on a self-service action', () => {
    // Borrowing another module's read grant (read_LeaveRequest was the usual
    // donor) meant a role could lose its own records if that unrelated module
    // was revoked, or gain this surface as a side effect of gaining one.
    const ownRoutes = endpoints.filter(
      (endpoint) => endpoint.action && /\/me(\/|$)/.test(endpoint.path),
    );
    const borrowed = ownRoutes
      .filter((endpoint) => !selfServiceGrants.includes(endpoint.action!))
      .map((endpoint) => `${endpoint.key} -> ${endpoint.action}`);

    expect(borrowed).toEqual([]);
  });

  it('authorises goal self-service on the goal actions', () => {
    expect(endpoints.find((e) => e.key === 'GET /goals')?.action).toBe('read_OwnGoal');
    expect(endpoints.find((e) => e.key === 'PATCH /goals/:_id/progress')?.action).toBe(
      'update_OwnGoalProgress',
    );
  });

  it('keeps the dashboard gated per module inside the service', () => {
    const service = fs.readFileSync(path.join(SRC, 'services', 'hrInsights.services.ts'), 'utf8');
    expect(service).toContain("actions.has('read_Employee')");
    expect(service).toContain("actions.has('read_Attendance')");
    expect(service).toContain("actions.has('read_LeaveRequest')");
  });

  it('leaves exactly the credential entry points unauthenticated', () => {
    const anonymous = endpoints.filter((endpoint) => !endpoint.authenticated).map((endpoint) => endpoint.key);
    expect(anonymous.sort()).toEqual([...PUBLIC_ROUTES].sort());
  });

  it('gates every authenticated route on an action unless it is self-service', () => {
    const ungated = endpoints
      .filter((endpoint) => endpoint.authenticated && !endpoint.action)
      .map((endpoint) => endpoint.key);
    expect(ungated.sort()).toEqual([...SELF_SERVICE_ROUTES].sort());
  });

  it('only requires actions that exist in the seeded catalogue', () => {
    const unknown = endpoints
      .filter((endpoint) => endpoint.action && !ACTION_CATALOGUE.includes(endpoint.action))
      .map((endpoint) => `${endpoint.key} -> ${endpoint.action}`);
    expect(unknown).toEqual([]);
  });
});

describe('authorization matrix — role × endpoint', () => {
  beforeEach(() => jest.clearAllMocks());

  const gated = endpoints.filter((endpoint) => endpoint.action);

  it('matches the seeded grants for every route and every role', async () => {
    const mismatches: string[] = [];

    for (const endpoint of gated) {
      for (const role of ROLE_NAMES) {
        const expected = ROLE_GRANTS[role]!.includes(endpoint.action!);
        const actual = await isAllowed(ROLE_GRANTS[role]!, endpoint.action!);
        if (expected !== actual) {
          mismatches.push(`${role} ${endpoint.key} (${endpoint.action}) expected ${expected ? 'allow' : 'deny'}`);
        }
      }
    }

    expect(mismatches).toEqual([]);
  });

  it('keeps the main resources inside the intended roles', () => {
    const allowed = (role: string, action: string) => ROLE_GRANTS[role]!.includes(action);

    // Self-service leave: everyone files and reads their own.
    expect(allowed('Employee', 'create_LeaveRequest')).toBe(true);
    // Only a manager-level role decides leave.
    expect(allowed('Employee', 'approveReject_LeaveRequest')).toBe(false);
    expect(allowed('Manager', 'approveReject_LeaveRequest')).toBe(true);

    // Roster, payroll and users are HR/Admin concerns.
    expect(allowed('Employee', 'read_Employee')).toBe(false);
    expect(allowed('Manager', 'read_Payroll')).toBe(false);
    expect(allowed('HR', 'read_Payroll')).toBe(true);
    expect(allowed('HR', 'update_User')).toBe(true);
    expect(allowed('Manager', 'update_User')).toBe(false);

    // Nothing outside Admin may edit the security model itself.
    expect(allowed('HR', 'update_Role')).toBe(false);
    expect(allowed('Manager', 'update_Role')).toBe(false);
  });

  it('lets HR finish the payroll lifecycle', () => {
    // The `_Payroll` suffix filter cannot match update_PayrollStatus, so the
    // seed grants it explicitly; without it HR could create a payroll run but
    // never approve or mark one paid.
    const canApprove = ROLE_NAMES.filter((role) => ROLE_GRANTS[role]!.includes('update_PayrollStatus'));
    expect(canApprove).toEqual(['Admin', 'HR']);
  });
});

describe('authorization matrix — own record vs other record', () => {
  const userModelMock = jest.requireMock('../models/user.model') as { findById: jest.Mock };
  const employeeModelMock = jest.requireMock('../models/employee.model') as {
    findOne: jest.Mock;
    find: jest.Mock;
  };

  const OWN = 'emp-own';
  const COLLEAGUE = 'emp-colleague';
  const DIRECT_REPORT = 'emp-report';

  /** Signs in a user of the given role, with the given employee record. */
  const signIn = (roleName: string, employeeId?: string, reports: string[] = []) => {
    userModelMock.findById.mockResolvedValue({ _id: 'user-1', roleId: 'role-1' });
    roleModelMock.findById.mockResolvedValue({ roleName });
    employeeModelMock.findOne.mockResolvedValue(employeeId ? { _id: employeeId } : null);
    employeeModelMock.find.mockReturnValue({
      select: jest.fn().mockResolvedValue(reports.map((id) => ({ _id: id }))),
    });
  };

  beforeEach(() => jest.clearAllMocks());

  it('lets an employee read their own record but not a colleague', async () => {
    signIn('Employee', OWN);
    const scope = await resolveReadScope('user-1');

    expect(canAccessEmployee(scope, OWN)).toBe(true);
    expect(canAccessEmployee(scope, COLLEAGUE)).toBe(false);
    expect(scope.canReadAll).toBe(false);
  });

  it('lets a manager read a direct report but not an unrelated employee', async () => {
    signIn('Manager', OWN, [DIRECT_REPORT]);
    const scope = await resolveReadScope('user-1');

    expect(canAccessEmployee(scope, OWN)).toBe(true);
    expect(canAccessEmployee(scope, DIRECT_REPORT)).toBe(true);
    expect(canAccessEmployee(scope, COLLEAGUE)).toBe(false);
  });

  it('lets HR and Admin read any employee without an employee record', async () => {
    signIn('HR');
    expect(canAccessEmployee(await resolveReadScope('user-1'), COLLEAGUE)).toBe(true);

    signIn('Admin');
    expect(canAccessEmployee(await resolveReadScope('user-1'), COLLEAGUE)).toBe(true);
  });

  it('denies everything to a user with no employee record and no broad role', async () => {
    signIn('Employee');
    const scope = await resolveReadScope('user-1');

    expect(canAccessEmployee(scope, OWN)).toBe(false);
    expect(canAccessEmployee(scope, COLLEAGUE)).toBe(false);
  });

  it('turns the scope into a filter that cannot match other people', async () => {
    signIn('Employee', OWN, [DIRECT_REPORT]);
    const filter = scopeEmployeeFilter(await resolveReadScope('user-1')) as {
      employeeId: { $in: string[] };
    };

    expect(filter.employeeId.$in).toEqual([OWN, DIRECT_REPORT]);
  });

  it('lets a broad reader query the whole collection', async () => {
    signIn('HR');
    expect(scopeEmployeeFilter(await resolveReadScope('user-1'))).toEqual({});
  });
});
