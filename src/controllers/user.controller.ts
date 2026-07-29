import { Request, Response } from "express";
import catchAsync from "../utils/helper/catchAsync";
import userServices from "../services/user.services";
import { MESSAGES } from "../utils/helper/constants/messages";
import { StatusCode } from "../utils/helper/constants/enum";

const registerUser = catchAsync(async (req: Request, res: Response) => {
  const result = await userServices.registerUser(req.body);
  res.status(StatusCode.CREATED).json({ success: true, message: MESSAGES.USER_REGISTERED_SUCCESSFULLY, data: result });
});

const loginUser = catchAsync(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const result = await userServices.loginUser(email, password);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.USER_LOGGED_IN_SUCCESSFULLY, data: result });
});

const getAllUser = catchAsync(async (req: Request, res: Response) => {
  const result = await userServices.getAllUser(req.query as any);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.ALL_USERS_FETCHED_SUCCESSFULLY, data: result });
});

const getUserById = catchAsync(async (req: Request, res: Response) => {
  const { _id } = req.params;
  const result = await userServices.getUserById(_id as string);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.USER_FETCHED_SUCCESSFULLY, data: result });
});

const updateUser = catchAsync(async (req: Request, res: Response) => {
  const { _id } = req.params;
  const result = await userServices.updateUser(_id as string, req.body);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.USER_UPDATED_SUCCESSFULLY, data: result });
});

const deleteUser = catchAsync(async (req: Request, res: Response) => {
  const { _id } = req.params;
  await userServices.deleteUser(_id as string);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.USER_DELETED_SUCCESSFULLY, data: null });
});

const updateStatus = catchAsync(async (req: Request, res: Response) => {
  const { _id } = req.params;
  const { isActive } = req.body;
  const result = await userServices.updateUserStatus(_id as string, isActive);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.USER_STATUS_UPDATED_SUCCESSFULLY, data: result });
});

const updateRole = catchAsync(async (req: Request, res: Response) => {
  const { _id } = req.params;
  const { roleId } = req.body;
  const result = await userServices.updateUserRole(_id as string, roleId);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.USER_ROLE_UPDATED_SUCCESSFULLY, data: result });
});

export default {
  registerUser,
  loginUser,
  getAllUser,
  getUserById,
  updateUser,
  deleteUser,
  updateStatus,
  updateRole,
};
