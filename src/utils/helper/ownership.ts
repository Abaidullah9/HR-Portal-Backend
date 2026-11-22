import userModel from "../../models/user.model";
import roleModel from "../../models/role.model";
import employeeModel from "../../models/employee.model";

export interface ReadScope {
  canReadAll: boolean;
  ownEmployeeId?: string;
  /** Direct reports of the caller, when they manage anyone. */
  managedEmployeeIds?: string[];
  roleName?: string;
}

/**
 * Three levels, not two: a line manager may reach their own reports' records
 * without being granted company-wide read access.
 */
export const resolveReadScope = async (userId: string): Promise<ReadScope> => {
  if (!userId) return { canReadAll: false };

  const user = await userModel.findById(userId);
  if (!user) return { canReadAll: false };

  const role = await roleModel.findById(user.roleId);
  const roleName = role?.roleName?.toLowerCase();
  if (roleName === "admin" || roleName === "hr") {
    return { canReadAll: true, ...(roleName ? { roleName } : {}) };
  }

  const employee = await employeeModel.findOne({ userId });
  if (!employee) return { canReadAll: false, ...(roleName ? { roleName } : {}) };

  const reports = await employeeModel
    .find({ reportingManagerId: employee._id })
    .select('_id');

  return {
    canReadAll: false,
    ownEmployeeId: employee._id.toString(),
    managedEmployeeIds: reports.map((report) => report._id.toString()),
    ...(roleName ? { roleName } : {}),
  };
};

/** Whether the caller may see this employee's own records. */
export const canAccessEmployee = (scope: ReadScope, employeeId: string): boolean => {
  if (!employeeId) return false;
  if (scope.canReadAll) return true;
  if (scope.ownEmployeeId === employeeId) return true;
  return (scope.managedEmployeeIds ?? []).includes(employeeId);
};

/** Mongo filter limiting person-scoped collections to what the scope may read. */
export const scopeEmployeeFilter = (scope: ReadScope, field = 'employeeId'): Record<string, unknown> => {
  if (scope.canReadAll) return {};
  const reachable = [scope.ownEmployeeId, ...(scope.managedEmployeeIds ?? [])].filter(
    (id): id is string => Boolean(id),
  );
  return { [field]: reachable.length > 0 ? { $in: reachable } : null };
};
