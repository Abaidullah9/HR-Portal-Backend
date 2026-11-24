import { Request, Response } from "express";
import { sendErrorResponse } from "../utils/helper/sendError";
import userServices from "../services/user.services";
import { MESSAGES } from "../utils/helper/constants/messages";
import { StatusCode } from "../utils/helper/constants/enum";
import { AppError } from "../utils/helper/AppError";
import { CreateUserDTO, UpdateUserDTO } from "../utils/dtos/user.dto";
import { PaginationQuery } from "../utils/common";
import { currentContext } from "../utils/context";
import { generateToken } from "../utils/helper/helper.functions";
import { sessionCookieOptions } from "../utils/cookies";

const setTokenCookie = (res: Response, token: string) => {
  res.cookie("accessToken", token, sessionCookieOptions());
};

const registerUser = async (req: Request, res: Response) => {
  try {
    const body: CreateUserDTO = req.body;
    const { user, token } = await userServices.registerUser(body);
    if (!user) throw new AppError(MESSAGES.FAILED_TO_CREATE_USER, StatusCode.INTERNAL_SERVER_ERROR);
    setTokenCookie(res, token);
    res.status(StatusCode.CREATED).json({ success: true, message: MESSAGES.USER_REGISTERED_SUCCESSFULLY, data: { user, token } });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const loginUser = async (req: Request, res: Response) => {
  try {
    const { email, password }: { email: string; password: string } = req.body;
    const { user, token } = await userServices.loginUser(email, password);
    if (!user) throw new AppError(MESSAGES.INVALID_CREDENTIALS, StatusCode.UNAUTHORIZED);
    setTokenCookie(res, token);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.USER_LOGGED_IN_SUCCESSFULLY, data: { user, token } });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const logoutUser = async (_req: Request, res: Response) => {
  try {
    // Browsers match a deletion on name and path alone.
    res.clearCookie("accessToken", { path: "/" });
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.USER_LOGGED_OUT_SUCCESSFULLY });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};



const getAllUser = async (req: Request, res: Response) => {
  try {
    const { data, pagination } = await userServices.getAllUser(req.query as PaginationQuery);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.ALL_USERS_FETCHED_SUCCESSFULLY, data, pagination });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const getUserById = async (req: Request, res: Response) => {
  try {
    const { _id } = req.params;
    const result = await userServices.getUserById(_id as string);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.USER_FETCHED_SUCCESSFULLY, data: result });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const updateUser = async (req: Request, res: Response) => {
  try {
    const { _id } = req.params;
    const updateData: UpdateUserDTO = req.body;
    const result = await userServices.updateUser(_id as string, updateData);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.USER_UPDATED_SUCCESSFULLY, data: result });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const deleteUser = async (req: Request, res: Response) => {
  try {
    const { _id } = req.params;
    const deletedUser = await userServices.deleteUser(_id as string);
    if (!deletedUser) throw new AppError(MESSAGES.USER_NOT_FOUND, StatusCode.NOT_FOUND);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.USER_DELETED_SUCCESSFULLY, data: deletedUser });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const updateStatus = async (req: Request, res: Response) => {
  try {
    const { _id } = req.params;
    const { isActive }: { isActive: boolean } = req.body;
    const result = await userServices.updateUserStatus(_id as string, isActive);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.USER_STATUS_UPDATED_SUCCESSFULLY, data: result });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const updateRole = async (req: Request, res: Response) => {
  try {
    const { _id } = req.params;
    const { roleId }: { roleId: string } = req.body;
    const result = await userServices.updateUserRole(_id as string, roleId);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.USER_ROLE_UPDATED_SUCCESSFULLY, data: result });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const inviteUser = async (req: Request, res: Response) => {
  try {
    const { name, email, roleId, roleName } = req.body as {
      name?: string;
      email?: string;
      roleId?: string;
      roleName?: string;
    };
    const data = await userServices.inviteUser(
      { name: name ?? '', email: email ?? '', ...(roleId ? { roleId } : {}), ...(roleName ? { roleName } : {}) },
      currentContext()?.organizationId,
    );
    res.status(StatusCode.CREATED).json({ success: true, message: 'Invite sent', data });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const acceptInvite = async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body as { token?: string; password?: string };
    const user = await userServices.acceptInvite(token ?? '', password ?? '');
    const jwt = generateToken(user._id.toString());
    setTokenCookie(res, jwt);
    res.status(StatusCode.OK).json({ success: true, message: 'Account activated', data: { user, token: jwt } });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const changePassword = async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body as {
      currentPassword?: string;
      newPassword?: string;
    };
    const data = await userServices.changePassword(req.userId!, currentPassword ?? '', newPassword ?? '');
    res.status(StatusCode.OK).json({ success: true, message: 'Password updated', data });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const getMe = async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const result = await userServices.getUserById(userId);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.USER_FETCHED_SUCCESSFULLY, data: result });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body as { email?: string };
    const data = await userServices.forgotPassword(email ?? "");
    res.status(StatusCode.OK).json({
      success: true,
      message: "If that email is registered, a reset link has been sent",
      data,
    });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body as { token?: string; password?: string };
    await userServices.resetPassword(token ?? "", password ?? "");
    res.status(StatusCode.OK).json({ success: true, message: "Password updated. Sign in with the new password." });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

export default {
  registerUser,
  inviteUser,
  acceptInvite,
  changePassword,
  forgotPassword,
  resetPassword,
  loginUser,
  logoutUser,
  getAllUser,
  getUserById,
  getMe,
  updateUser,
  deleteUser,
  updateStatus,
  updateRole,
};
