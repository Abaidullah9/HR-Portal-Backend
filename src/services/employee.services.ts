import { StatusCode } from "../utils/helper/constants/enum";
import { AppError } from "../utils/helper/AppError";
import employeeModel from "../models/employee.model";
import { CreateEmployeeDTO } from "../utils/dtos/employee.dto";
import { MESSAGES } from "../utils/helper/constants/messages";
import { getPagination, paginatedResult, PaginationQuery } from "../utils/common";

const addEmployee = async (employeeData: CreateEmployeeDTO) => {
  if (!employeeData) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const newEmployee = await employeeModel.create(employeeData);
  return newEmployee;
};

const getAllEmployee = async (query: PaginationQuery) => {
  const { page, limit, skip } = getPagination(query);
  const allEmployees = await employeeModel.find()
    .populate("userId", "name email")
    .populate("departmentId", "name")
    .populate("reportingManagerId", "name email")
    .skip(skip)
    .limit(limit);
  const total = await employeeModel.countDocuments();
  return paginatedResult(allEmployees, total, page, limit);
};

const getEmployeeById = async (_id: string) => {
  if (!_id) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const employeeById = await employeeModel.findById(_id)
    .populate("userId", "name email")
    .populate("departmentId", "name")
    .populate("reportingManagerId", "name email");
  if (!employeeById) throw new AppError(MESSAGES.EMPLOYEE_NOT_FOUND, StatusCode.NOT_FOUND);
  return employeeById;
};

const getEmployeeByUserId = async (userId: string) => {
  if (!userId) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const employee = await employeeModel.findOne({ userId })
    .populate("departmentId", "name")
    .populate("reportingManagerId", "name email");
  if (!employee) throw new AppError(MESSAGES.EMPLOYEE_NOT_FOUND, StatusCode.NOT_FOUND);
  return employee;
};

const getEmployeesByDepartment = async (departmentId: string) => {
  if (!departmentId) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const employees = await employeeModel.find({ departmentId })
    .populate("userId", "name email")
    .populate("reportingManagerId", "name email");
  if (!employees) throw new AppError(MESSAGES.EMPLOYEE_NOT_FOUND, StatusCode.NOT_FOUND);
  return employees;
};

const getEmployeesByReportingManager = async (managerId: string) => {
  if (!managerId) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const employees = await employeeModel.find({ reportingManagerId: managerId })
    .populate("userId", "name email")
    .populate("departmentId", "name");
  if (!employees) throw new AppError(MESSAGES.EMPLOYEE_NOT_FOUND, StatusCode.NOT_FOUND);
  return employees;
};

const getActiveEmployees = async () => {
  const employees = await employeeModel.find({ isActive: true })
    .populate("userId", "name email")
    .populate("departmentId", "name");
  if (!employees) throw new AppError(MESSAGES.EMPLOYEE_NOT_FOUND, StatusCode.NOT_FOUND);
  return employees;
};

const updateEmployee = async (_id: string, updateData: Partial<CreateEmployeeDTO>) => {
  if (!_id) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const updatedEmployee = await employeeModel.findByIdAndUpdate(_id, updateData, { returnDocument: 'after' })
    .populate("userId", "name email")
    .populate("departmentId", "name")
    .populate("reportingManagerId", "name email");
  if (!updatedEmployee) throw new AppError(MESSAGES.EMPLOYEE_NOT_FOUND, StatusCode.NOT_FOUND);

  return updatedEmployee;
};

const deleteEmployee = async (_id: string) => {
  if (!_id) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const deletedEmployee = await employeeModel.findByIdAndDelete(_id);

  return deletedEmployee;
};

export default {
  addEmployee,
  getAllEmployee,
  getEmployeeById,
  getEmployeeByUserId,
  getEmployeesByDepartment,
  getEmployeesByReportingManager,
  getActiveEmployees,
  updateEmployee,
  deleteEmployee,
};
