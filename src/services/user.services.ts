import { StatusCode } from "../utils/helper/constants/enum";
import { AppError } from "../utils/helper/AppError";
import userModel from "../models/user.model";
import { CreateUserDTO } from "../utils/dtos/user.dto";
import { MESSAGES } from "../utils/helper/constants/messages";
import bcrypt from "bcryptjs";
import { generateToken } from "../utils/helper/helper.functions";
import { getPagination, paginatedResult, PaginationQuery } from "../utils/common";

const registerUser = async (userData: CreateUserDTO) => {
  if (!userData) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const existingUser = await userModel.findOne({ email: userData.email });
  if (existingUser) throw new AppError(MESSAGES.EMAIL_ALREADY_EXISTS, StatusCode.CONFLICT);

  const hashedPassword = await bcrypt.hash(userData.password, 10);
  const userToCreate = { ...userData, password: hashedPassword };

  const newUser = await userModel.create(userToCreate);
  const new_user = newUser.toObject();
  const { password: _, ...newuser } = new_user;
  const token = generateToken(newUser._id.toString());

  return { user: newuser, token };
};

const loginUser = async (email: string, password: string) => {
  if (!email || !password) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const user = await userModel.findOne({ email }).select("+password");
  if (!user) throw new AppError(MESSAGES.INVALID_CREDENTIALS, StatusCode.UNAUTHORIZED);

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new AppError(MESSAGES.INVALID_CREDENTIALS, StatusCode.UNAUTHORIZED);

  if (!user.isActive) throw new AppError(MESSAGES.ACCOUNT_DEACTIVATED, StatusCode.FORBIDDEN);

  user.lastLogin = new Date();
  await user.save();

  const user_obj = user.toObject();
  const { password: _, ...userData } = user_obj;
  const token = generateToken(user._id.toString());

  return { user: userData, token };
};

const getAllUser = async (query: PaginationQuery) => {
  const { page, limit, skip } = getPagination(query);
  const allUsers = await userModel.find().select("-password").populate("roleId", "roleName").skip(skip).limit(limit);
  const total = await userModel.countDocuments();
  if (!allUsers) throw new AppError(MESSAGES.USER_NOT_FOUND, StatusCode.NOT_FOUND);
  return paginatedResult(allUsers, total, page, limit);
};

const getUserById = async (_id: string) => {
  if (!_id) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const userById = await userModel.findById(_id).select("-password").populate("roleId", "roleName");
  if (!userById) throw new AppError(MESSAGES.USER_NOT_FOUND, StatusCode.NOT_FOUND);
  return userById;
};

const updateUser = async (_id: string, updateData: Partial<CreateUserDTO>) => {
  if (!_id || !updateData) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  if (updateData.email) {
    const existingUser = await userModel.findOne({ email: updateData.email });
    if (existingUser && existingUser._id.toString() !== _id) {
      throw new AppError(MESSAGES.EMAIL_ALREADY_EXISTS, StatusCode.CONFLICT);
    }
  }
  const updatedUserData = {
    ...updateData,
    ...(updateData.password ? { password: await bcrypt.hash(updateData.password, 10) } : {}),
  };

  const updatedUser = await userModel.findByIdAndUpdate(_id, updatedUserData, { returnDocument: 'after' }).select("-password").populate("roleId", "roleName");
  if (!updatedUser) throw new AppError(MESSAGES.USER_NOT_FOUND, StatusCode.NOT_FOUND);

  return updatedUser;
};

const deleteUser = async (_id: string) => {
  if (!_id) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const deletedUser = await userModel.findByIdAndDelete(_id).select("-password");

  return deletedUser;
};

const updateUserStatus = async (_id: string, isActive: boolean) => {
  if (!_id || isActive === undefined) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const updatedUser = await userModel.findByIdAndUpdate(_id, { isActive }, { returnDocument: 'after' }).select("-password").populate("roleId", "roleName");
  if (!updatedUser) throw new AppError(MESSAGES.USER_NOT_FOUND, StatusCode.NOT_FOUND);

  return updatedUser;
};

const updateUserRole = async (_id: string, roleId: string) => {
  if (!_id || !roleId) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const updatedUser = await userModel.findByIdAndUpdate(_id, { roleId }, { returnDocument: 'after' }).select("-password").populate("roleId", "roleName");
  if (!updatedUser) throw new AppError(MESSAGES.USER_NOT_FOUND, StatusCode.NOT_FOUND);

  return updatedUser;
};

export default {
  registerUser,
  loginUser,
  getAllUser,
  getUserById,
  updateUser,
  deleteUser,
  updateUserStatus,
  updateUserRole,
};
