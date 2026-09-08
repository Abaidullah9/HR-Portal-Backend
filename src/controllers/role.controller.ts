import { Request, Response } from "express";
import { sendErrorResponse } from "../utils/helper/sendError";
import roleServices from "../services/role.services";
import { MESSAGES } from "../utils/helper/constants/messages";
import { StatusCode } from "../utils/helper/constants/enum";
import { AppError } from "../utils/helper/AppError";
import { CreateRoleDTO, UpdateRoleDTO } from "../utils/dtos/role.dto";
import { PaginationQuery } from "../utils/common";

const addRole = async (req: Request, res: Response) => {
  try {
    const body: CreateRoleDTO = req.body;
    const newRole = await roleServices.addRole(body);
    if (!newRole) throw new AppError(MESSAGES.FAILED_TO_CREATE_ROLE, StatusCode.INTERNAL_SERVER_ERROR);
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
    const result = await roleServices.updateRole(_id as string, updateData);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.ROLE_UPDATED_SUCCESSFULLY, data: result });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const assignActionsToRole = async (req: Request, res: Response) => {
  try {
    const { _id } = req.params;
    const { actionIds }: { actionIds: string[] } = req.body;
    const result = await roleServices.assignActionsToRole(_id as string, actionIds);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.ROLE_UPDATED_SUCCESSFULLY, data: result });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const deleteRole = async (req: Request, res: Response) => {
  try {
    const { _id } = req.params;
    const deletedRole = await roleServices.deleteRole(_id as string);
    if (!deletedRole) throw new AppError(MESSAGES.ROLE_NOT_FOUND, StatusCode.NOT_FOUND);
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
