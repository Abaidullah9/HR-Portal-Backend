import User from "../models/user.model";
import { AppError } from "../utils/helper/AppError";
import { CreateUserDTO, UpdateUserDTO } from "../utils/dtos/user.dto";
import { validateEmail, validatePasswordLength, validateRequiredString } from "../utils/constants/validation.utils";
import bcrypt from "bcryptjs";
import { getPagination, paginatedResult, PaginationQuery } from "../utils/pagination";

const getUserById = async (userId: string) => {
  const user = await User.findById(userId).select("-password");
  if (!user) {
    throw new AppError("User not found", 404);
  }
  return user;
};

const registerUser = async (userData: CreateUserDTO) => {
  const missingFieldsError = !userData.name || !userData.email || !userData.password || !userData.roleId;
  if (missingFieldsError) {
    throw new AppError("Missing required fields: name, email, password, roleId", 400);
  }

  const emailError = validateEmail(userData.email);
  if (emailError) {
    throw new AppError(emailError, 400);
  }

  const passwordError = validatePasswordLength(userData.password);
  if (passwordError) {
    throw new AppError(passwordError, 400);
  }

  const existingUser = await User.findOne({ email: userData.email });
  if (existingUser) {
    throw new AppError("User with this email already exists", 409);
  }

  const hashedPassword = await bcrypt.hash(userData.password, 10);
  const userToCreate = { ...userData, password: hashedPassword };
  
  const newUser = await User.create(userToCreate);

  const userResponse = newUser.toObject();
  const { password: _, ...safeUserResponse } = userResponse;
  return safeUserResponse;
};


const loginUser = async (email: string, password: string) => {
  if (!email || !password) {
    throw new AppError("Email and password are required", 400);
  }

  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    throw new AppError("Invalid email or password", 401);
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new AppError("Invalid email or password", 401);
  }

  if (!user.isActive) {
    throw new AppError("Account is deactivated", 403);
  }

  user.lastLogin = new Date();
  await user.save();

  const { password: _, ...userResponse } = user.toObject();
  return userResponse;
};

const updateUser = async (userId: string, updateData: UpdateUserDTO) => {
  if (updateData.email) {
    const emailError = validateEmail(updateData.email);
    if (emailError) {
      throw new AppError(emailError, 400);
    }
  }

  if (updateData.name) {
    const nameError = validateRequiredString(updateData.name, "Name");
    if (nameError) {
      throw new AppError(nameError, 400);
    }
  }

  // Build mutable update payload to avoid mutating the input DTO
  const updatePayload: Record<string, any> = { ...updateData };

  if (updatePayload.password) {
    const passwordError = validatePasswordLength(updatePayload.password);
    if (passwordError) {
      throw new AppError(passwordError, 400);
    }
    updatePayload.password = await bcrypt.hash(updatePayload.password, 10);
  }

  if (updatePayload.email) {
    const existingUser = await User.findOne({ email: updatePayload.email });
    if (existingUser && existingUser._id.toString() !== userId) {
      throw new AppError("Email already in use", 409);
    }
  }

  const user = await User.findByIdAndUpdate(userId, updatePayload, { new: true, runValidators: true }).select("-password");
  if (!user) {
    throw new AppError("User not found", 404);
  }

  return user;
};

const deleteUser = async (userId: string) => {
  const user = await User.findByIdAndDelete(userId);
  if (!user) {
    throw new AppError("User not found", 404);
  }
  return user;
};

const getAllUser = async (query?: PaginationQuery) => {
  if (!query || (!query.page && !query.limit)) {
    const users = await User.find().select("-password");
    return users;
  }
  const { page, limit, skip } = getPagination(query);
  const [users, total] = await Promise.all([
    User.find().skip(skip).limit(limit).select("-password"),
    User.countDocuments(),
  ]);
  return paginatedResult(users, total, page, limit);
};

const updateUserStatus = async (userId: string, isActive: boolean) => {
  const user = await User.findByIdAndUpdate(userId, { isActive }, { new: true }).select("-password");
  if (!user) {
    throw new AppError("User not found", 404);
  }
  return user;
};
const updateUserRole = async (userId: string, roleId: string) => {
  const user = await User.findByIdAndUpdate(userId, { roleId }, { new: true }).select("-password");
  if (!user) {
    throw new AppError("User not found", 404);
  }
    return user;
}
export default {
  getUserById,
  registerUser,
  loginUser,
  updateUser,
  deleteUser,
  getAllUser,
  updateUserStatus,
  updateUserRole,
};