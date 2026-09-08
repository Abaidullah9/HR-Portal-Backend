import userModel from "../../models/user.model";
import roleModel from "../../models/role.model";
import employeeModel from "../../models/employee.model";

export interface ReadScope {
  canReadAll: boolean;
  ownEmployeeId?: string;
}

export const resolveReadScope = async (userId: string): Promise<ReadScope> => {
  if (!userId) return { canReadAll: false };

  const user = await userModel.findById(userId);
  if (!user) return { canReadAll: false };

  const role = await roleModel.findById(user.roleId);
  const roleName = role?.roleName?.toLowerCase();
  if (roleName === "admin" || roleName === "hr") {
    return { canReadAll: true };
  }

  const employee = await employeeModel.findOne({ userId });
  if (!employee) return { canReadAll: false };
  return { canReadAll: false, ownEmployeeId: employee._id.toString() };
};
