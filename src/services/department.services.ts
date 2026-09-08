import { StatusCode } from "../utils/helper/constants/enum";
import { AppError } from "../utils/helper/AppError";
import departmentModel from "../models/department.model";
import { CreateDepartmentDTO } from "../utils/dtos/department.dto";
import { MESSAGES } from "../utils/helper/constants/messages";
import { getPagination, paginatedResult, PaginationQuery } from "../utils/common";

const addDepartment = async (departmentData: CreateDepartmentDTO) => {
  if (!departmentData) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const newDepartment = await departmentModel.create(departmentData);
  return newDepartment;
};

const getAllDepartment = async (query: PaginationQuery) => {
  const { page, limit, skip } = getPagination(query);
  const allDepartments = await departmentModel.find()
    .populate("managerId", "name email")
    .populate("parentId", "name")
    .skip(skip)
    .limit(limit);
  const total = await departmentModel.countDocuments();
  return paginatedResult(allDepartments, total, page, limit);
};

const getDepartmentById = async (_id: string) => {
  if (!_id) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const departmentById = await departmentModel.findById(_id)
    .populate("managerId", "name email")
    .populate("parentId", "name");
  if (!departmentById) throw new AppError(MESSAGES.DEPARTMENT_NOT_FOUND, StatusCode.NOT_FOUND);
  return departmentById;
};

const getChildDepartments = async (parentId: string) => {
  if (!parentId) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const departments = await departmentModel.find({ parentId }).populate("managerId", "name email");
  if (!departments) throw new AppError(MESSAGES.DEPARTMENT_NOT_FOUND, StatusCode.NOT_FOUND);
  return departments;
};

const updateDepartment = async (_id: string, updateData: Partial<CreateDepartmentDTO>) => {
  if (!_id) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const updatedDepartment = await departmentModel.findByIdAndUpdate(_id, updateData, { returnDocument: 'after' })
    .populate("managerId", "name email")
    .populate("parentId", "name");
  if (!updatedDepartment) throw new AppError(MESSAGES.DEPARTMENT_NOT_FOUND, StatusCode.NOT_FOUND);

  return updatedDepartment;
};

const deleteDepartment = async (_id: string) => {
  if (!_id) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const deletedDepartment = await departmentModel.findByIdAndDelete(_id);

  return deletedDepartment;
};

export default {
  addDepartment,
  getAllDepartment,
  getDepartmentById,
  getChildDepartments,
  updateDepartment,
  deleteDepartment,
};
