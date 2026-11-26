import { Request, Response } from "express";
import { sendErrorResponse } from "../utils/helper/sendError";
import roleServices from "../services/role.services";
import { MESSAGES } from "../utils/helper/constants/messages";
import { StatusCode } from "../utils/helper/constants/enum";
import { AppError } from "../utils/helper/AppError";
import { CreateRoleDTO, UpdateRoleDTO } from "../utils/dtos/role.dto";
import { PaginationQuery } from "../utils/common";
import { diffFields, recordAudit } from "../utils/helper/audit";

const ROLE_FIELDS = ["roleName", "actions"];

const idOf = (value: unknown): string | undefined => {
  if (!value) return undefined;
  if (typeof value === "object" && "_id" in (value as Record<string, unknown>)) {
    return (value as { _id?: { toString?: () => string } })._id?.toString?.();
  }
  return (value as { toString?: () => string }).toString?.();
};

const roleSnapshot = (role: any): Record<string, unknown> => ({
  roleName: role?.roleName,
  actions: (role?.actions ?? []).map(idOf),
});

const addRole = async (req: Request, res: Response) => {
  try {
    const body: CreateRoleDTO = req.body;
    const newRole = await roleServices.addRole(body);
    if (!newRole) throw new AppError(MESSAGES.FAILED_TO_CREATE_ROLE, StatusCode.INTERNAL_SERVER_ERROR);
    await recordAudit(req.userId, {
      action: "role.create",
      entity: "Role",
      entityId: newRole._id.toString(),
      changes: diffFields({}, roleSnapshot(newRole), ROLE_FIELDS),
    }, res);
    res.status(StatusCode.CREATED).json({ success: true, message: MESSAGES.ROLE_ADDED_SUCCESSFULLY, data: newRole });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const getAllRole = async (req: Request, res: Response) => {
  try {
    const { data, pagination } = await roleServices.getAllRole(req.query as PaginationQuery);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.ALL_ROLES_FETCHED_SUCCESSFULLY, data, pagination });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const getRoleById = async (req: Request, res: Response) => {
  try {
    const { _id } = req.params;
    const result = await roleServices.getRoleById(_id as string);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.ROLE_FETCHED_SUCCESSFULLY, data: result });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const updateRole = async (req: Request, res: Response) => {
  try {
    const { _id } = req.params;
    const updateData: UpdateRoleDTO = req.body;
    const before = await roleServices.getRoleById(_id as string);
    const result = await roleServices.updateRole(_id as string, updateData);
    await recordAudit(req.userId, {
      action: "role.update",
      entity: "Role",
      entityId: _id as string,
      changes: diffFields(roleSnapshot(before), roleSnapshot(result), ROLE_FIELDS),
    }, res);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.ROLE_UPDATED_SUCCESSFULLY, data: result });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const assignActionsToRole = async (req: Request, res: Response) => {
  try {
    const { _id } = req.params;
    const { actionIds }: { actionIds: string[] } = req.body;
    const before = await roleServices.getRoleById(_id as string);
    const result = await roleServices.assignActionsToRole(_id as string, actionIds);
    await recordAudit(req.userId, {
      action: "role.assignActions",
      entity: "Role",
      entityId: _id as string,
      changes: diffFields(roleSnapshot(before), roleSnapshot(result), ROLE_FIELDS),
    }, res);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.ROLE_UPDATED_SUCCESSFULLY, data: result });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const deleteRole = async (req: Request, res: Response) => {
  try {
    const { _id } = req.params;
    const before = await roleServices.getRoleById(_id as string);
    const deletedRole = await roleServices.deleteRole(_id as string);
    if (!deletedRole) throw new AppError(MESSAGES.ROLE_NOT_FOUND, StatusCode.NOT_FOUND);
    await recordAudit(req.userId, {
      action: "role.delete",
      entity: "Role",
      entityId: _id as string,
      changes: diffFields(roleSnapshot(before), {}, ROLE_FIELDS),
    }, res);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.ROLE_DELETED_SUCCESSFULLY, data: deletedRole });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

export default {
  addRole,
  getAllRole,
  getRoleById,
  updateRole,
  assignActionsToRole,
  deleteRole,
};
