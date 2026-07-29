import Department from "../models/department.model";
import { AppError } from "../utils/helper/AppError";
import { CreateDepartmentDTO, UpdateDepartmentDTO } from "../utils/dtos/department.dto";
import { getPagination, paginatedResult, PaginationQuery } from "../utils/pagination";

const addDepartment = async (departmentData: CreateDepartmentDTO) => {
  if (!departmentData.name) {
    throw new AppError("Department name is required", 400);
  }

  const existingDept = await Department.findOne({ name: departmentData.name });
  if (existingDept) {
    throw new AppError("Department with this name already exists", 409);
  }

  const department = await Department.create(departmentData);
  return department;
};

const getAllDepartment = async (query?: PaginationQuery) => {
  if (!query || (!query.page && !query.limit)) {
    const departments = await Department.find()
      .populate("managerId", "name email")
      .populate("parentId", "name");
    return departments;
  }
  const { page, limit, skip } = getPagination(query);
  const [departments, total] = await Promise.all([
    Department.find()
      .skip(skip).limit(limit)
      .populate("managerId", "name email")
      .populate("parentId", "name"),
    Department.countDocuments(),
  ]);
  return paginatedResult(departments, total, page, limit);
};

const getDepartmentById = async (departmentId: string) => {
  const department = await Department.findById(departmentId)
    .populate("managerId", "name email")
    .populate("parentId", "name");
  if (!department) {
    throw new AppError("Department not found", 404);
  }
  return department;
};

const getChildDepartments = async (parentId: string) => {
  const departments = await Department.find({ parentId }).populate("managerId", "name email");
  return departments;
};

const updateDepartment = async (departmentId: string, updateData: UpdateDepartmentDTO) => {
  if (updateData.name) {
    const existingDept = await Department.findOne({ name: updateData.name });
    if (existingDept && existingDept._id.toString() !== departmentId) {
      throw new AppError("Department with this name already exists", 409);
    }
  }

  const department = await Department.findByIdAndUpdate(departmentId, updateData, { new: true, runValidators: true });
  if (!department) {
    throw new AppError("Department not found", 404);
  }
  return department;
};

const deleteDepartment = async (departmentId: string) => {
  // Check if department has child departments
  const children = await Department.countDocuments({ parentId: departmentId });
  if (children > 0) {
    throw new AppError("Cannot delete department with child departments. Reassign or delete children first.", 400);
  }

  const department = await Department.findByIdAndDelete(departmentId);
  if (!department) {
    throw new AppError("Department not found", 404);
  }
  return department;
};

export default {
  addDepartment,
  getAllDepartment,
  getDepartmentById,
  getChildDepartments,
  updateDepartment,
  deleteDepartment,
};
