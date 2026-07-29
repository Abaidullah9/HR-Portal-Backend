import { Request, Response } from "express";
import catchAsync from "../utils/helper/catchAsync";
import roleServices from "../services/role.services";
import { MESSAGES } from "../utils/helper/constants/messages";
import { StatusCode } from "../utils/helper/constants/enum";

const addRole = catchAsync(async (req: Request, res: Response) => {
  const result = await roleServices.addRole(req.body);
  res.status(StatusCode.CREATED).json({ success: true, message: MESSAGES.ROLE_ADDED_SUCCESSFULLY, data: result });
});

const getAllRole = catchAsync(async (req: Request, res: Response) => {
  const result = await roleServices.getAllRole();
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.ALL_ROLES_FETCHED_SUCCESSFULLY, data: result });
});

const getRoleById = catchAsync(async (req: Request, res: Response) => {
  const { _id } = req.params;
  const result = await roleServices.getRoleById(_id as string);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.ROLE_FETCHED_SUCCESSFULLY, data: result });
});

const updateRole = catchAsync(async (req: Request, res: Response) => {
  const { _id } = req.params;
  const result = await roleServices.updateRole(_id as string, req.body);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.ROLE_UPDATED_SUCCESSFULLY, data: result });
});

const assignActionsToRole = catchAsync(async (req: Request, res: Response) => {
  const { _id } = req.params;
  const { actionIds } = req.body;
  const result = await roleServices.assignActionsToRole(_id as string, actionIds);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.ROLE_UPDATED_SUCCESSFULLY, data: result });
});

const deleteRole = catchAsync(async (req: Request, res: Response) => {
  const { _id } = req.params;
  await roleServices.deleteRole(_id as string);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.ROLE_DELETED_SUCCESSFULLY, data: null });
});

export default {
  addRole,
  getAllRole,
  getRoleById,
  updateRole,
  assignActionsToRole,
  deleteRole,
};
