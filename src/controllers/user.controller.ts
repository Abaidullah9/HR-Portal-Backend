import { Request, Response } from "express";
import { sendErrorResponse } from "../utils/helper/sendError";
import userServices from "../services/user.services";
import { MESSAGES } from "../utils/helper/constants/messages";
import { StatusCode } from "../utils/helper/constants/enum";
import { AppError } from "../utils/helper/AppError";
import { CreateUserDTO, UpdateUserDTO } from "../utils/dtos/user.dto";
import { PaginationQuery } from "../utils/common";

const setTokenCookie = (res: Response, token: string) => {
  res.cookie("accessToken", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, 
  });
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
    res.cookie("accessToken", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
      maxAge: 0, 
    });
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

const getMe = async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const result = await userServices.getUserById(userId);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.USER_FETCHED_SUCCESSFULLY, data: result });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

export default {
  registerUser,
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
