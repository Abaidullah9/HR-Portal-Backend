import Role from "../models/role.model";
import { AppError } from "../utils/helper/AppError";
import { CreateRoleDTO, UpdateRoleDTO } from "../utils/dtos/role.dto";
import { getPagination, paginatedResult, PaginationQuery } from "../utils/pagination";

const addRole = async (roleData: CreateRoleDTO) => {
  if (!roleData.roleName) {
    throw new AppError("Role name is required", 400);
  }

  const existingRole = await Role.findOne({ roleName: roleData.roleName });
  if (existingRole) {
    throw new AppError("Role with this name already exists", 409);
  }

  const role = await Role.create(roleData);
  return role;
};

const getAllRole = async (query?: PaginationQuery) => {
  if (!query || (!query.page && !query.limit)) {
    const roles = await Role.find().populate("actions");
    return roles;
  }
  const { page, limit, skip } = getPagination(query);
  const [roles, total] = await Promise.all([
    Role.find().skip(skip).limit(limit).populate("actions"),
    Role.countDocuments(),
  ]);
  return paginatedResult(roles, total, page, limit);
};

const getRoleById = async (roleId: string) => {
  const role = await Role.findById(roleId).populate("actions");
  if (!role) {
    throw new AppError("Role not found", 404);
  }
  return role;
};

const updateRole = async (roleId: string, updateData: UpdateRoleDTO) => {
  if (updateData.roleName) {
    const existingRole = await Role.findOne({ roleName: updateData.roleName });
    if (existingRole && existingRole._id.toString() !== roleId) {
      throw new AppError("Role with this name already exists", 409);
    }
  }

  const role = await Role.findByIdAndUpdate(roleId, updateData, { new: true, runValidators: true }).populate("actions");
  if (!role) {
    throw new AppError("Role not found", 404);
  }
  return role;
};

const assignActionsToRole = async (roleId: string, actionIds: string[]) => {
  const role = await Role.findByIdAndUpdate(roleId, { actions: actionIds }, { new: true }).populate("actions");
  if (!role) {
    throw new AppError("Role not found", 404);
  }
  return role;
};

const deleteRole = async (roleId: string) => {
  const role = await Role.findByIdAndDelete(roleId);
  if (!role) {
    throw new AppError("Role not found", 404);
  }
  return role;
};

export default {
  addRole,
  getAllRole,
  getRoleById,
  updateRole,
  assignActionsToRole,
  deleteRole,
};
