import { StatusCode } from "../utils/helper/constants/enum";
import { AppError } from "../utils/helper/AppError";
import roleModel from "../models/role.model";
import { CreateRoleDTO } from "../utils/dtos/role.dto";
import { MESSAGES } from "../utils/helper/constants/messages";
import { getPagination, paginatedResult, PaginationQuery } from "../utils/common";

const addRole = async (roleData: CreateRoleDTO) => {
  if (!roleData) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const newRole = await roleModel.create(roleData);
  return newRole;
};

const getAllRole = async (query: PaginationQuery) => {
  const { page, limit, skip } = getPagination(query);
  const allRoles = await roleModel.find().populate("actions").skip(skip).limit(limit);
  const total = await roleModel.countDocuments();
  if (!allRoles) throw new AppError(MESSAGES.ROLE_NOT_FOUND, StatusCode.NOT_FOUND);
  return paginatedResult(allRoles, total, page, limit);
};

const getRoleById = async (_id: string) => {
  if (!_id) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const roleById = await roleModel.findById(_id).populate("actions");
  if (!roleById) throw new AppError(MESSAGES.ROLE_NOT_FOUND, StatusCode.NOT_FOUND);
  return roleById;
};

const updateRole = async (_id: string, updateData: Partial<CreateRoleDTO>) => {
  if (!_id) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const updatedRole = await roleModel.findByIdAndUpdate(_id, updateData, { returnDocument: 'after' }).populate("actions");
  if (!updatedRole) throw new AppError(MESSAGES.ROLE_NOT_FOUND, StatusCode.NOT_FOUND);

  return updatedRole;
};

const assignActionsToRole = async (_id: string, actionIds: string[]) => {
  if (!_id || !actionIds) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const updatedRole = await roleModel.findByIdAndUpdate(_id, { actions: actionIds }, { returnDocument: 'after' }).populate("actions");
  if (!updatedRole) throw new AppError(MESSAGES.ROLE_NOT_FOUND, StatusCode.NOT_FOUND);

  return updatedRole;
};

const deleteRole = async (_id: string) => {
  if (!_id) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const deletedRole = await roleModel.findByIdAndDelete(_id);

  return deletedRole;
};

export default {
  addRole,
  getAllRole,
  getRoleById,
  updateRole,
  assignActionsToRole,
  deleteRole,
};
