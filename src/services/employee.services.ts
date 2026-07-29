import Employee from "../models/employee.model";
import { AppError } from "../utils/helper/AppError";
import { CreateEmployeeDTO, UpdateEmployeeDTO } from "../utils/dtos/employee.dto";
import { getPagination, paginatedResult, PaginationQuery } from "../utils/pagination";

const addEmployee = async (employeeData: CreateEmployeeDTO) => {
  if (!employeeData.name || !employeeData.email || !employeeData.organizationId || 
      !employeeData.userId || !employeeData.employeeCode || !employeeData.departmentId || 
      !employeeData.position || !employeeData.employmentType || !employeeData.joiningDate) {
    throw new AppError("Missing required fields", 400);
  }

  if (!/^\S+@\S+\.\S+$/.test(employeeData.email)) {
    throw new AppError("Invalid email format", 400);
  }

  // Check for existing employee with same email or code
  const existingEmail = await Employee.findOne({ email: employeeData.email });
  if (existingEmail) {
    throw new AppError("Employee with this email already exists", 409);
  }

  const existingCode = await Employee.findOne({ employeeCode: employeeData.employeeCode });
  if (existingCode) {
    throw new AppError("Employee with this code already exists", 409);
  }

  const employee = await Employee.create(employeeData);
  return employee;
};

const getAllEmployee = async (query?: PaginationQuery) => {
  if (!query || (!query.page && !query.limit)) {
    const employees = await Employee.find()
      .populate("userId", "name email")
      .populate("departmentId", "name")
      .populate("reportingManagerId", "name email");
    return employees;
  }

  const { page, limit, skip } = getPagination(query);
  const [employees, total] = await Promise.all([
    Employee.find()
      .skip(skip)
      .limit(limit)
      .populate("userId", "name email")
      .populate("departmentId", "name")
      .populate("reportingManagerId", "name email"),
    Employee.countDocuments(),
  ]);

  return paginatedResult(employees, total, page, limit);
};

const getEmployeeById = async (employeeId: string) => {
  const employee = await Employee.findById(employeeId)
    .populate("userId", "name email")
    .populate("departmentId", "name")
    .populate("reportingManagerId", "name email");
  if (!employee) {
    throw new AppError("Employee not found", 404);
  }
  return employee;
};

const getEmployeeByUserId = async (userId: string) => {
  const employee = await Employee.findOne({ userId })
    .populate("departmentId", "name")
    .populate("reportingManagerId", "name email");
  if (!employee) {
    throw new AppError("Employee not found for this user", 404);
  }
  return employee;
};

const getEmployeesByDepartment = async (departmentId: string) => {
  const employees = await Employee.find({ departmentId })
    .populate("userId", "name email")
    .populate("reportingManagerId", "name email");
  return employees;
};

const getEmployeesByReportingManager = async (managerId: string) => {
  const employees = await Employee.find({ reportingManagerId: managerId })
    .populate("userId", "name email")
    .populate("departmentId", "name");
  return employees;
};

const getActiveEmployees = async () => {
  const employees = await Employee.find({ isActive: true })
    .populate("userId", "name email")
    .populate("departmentId", "name");
  return employees;
};

const updateEmployee = async (employeeId: string, updateData: UpdateEmployeeDTO) => {
  if (updateData.email && !/^\S+@\S+\.\S+$/.test(updateData.email)) {
    throw new AppError("Invalid email format", 400);
  }

  if (updateData.email) {
    const existingEmail = await Employee.findOne({ email: updateData.email });
    if (existingEmail && existingEmail._id.toString() !== employeeId) {
      throw new AppError("Email already in use", 409);
    }
  }

  const employee = await Employee.findByIdAndUpdate(employeeId, updateData, { new: true, runValidators: true })
    .populate("userId", "name email")
    .populate("departmentId", "name")
    .populate("reportingManagerId", "name email");
  if (!employee) {
    throw new AppError("Employee not found", 404);
  }
  return employee;
};

const updateEmployeeStatus = async (employeeId: string, isActive: boolean) => {
  const employee = await Employee.findByIdAndUpdate(employeeId, { isActive }, { new: true });
  if (!employee) {
    throw new AppError("Employee not found", 404);
  }
  return employee;
};

const deleteEmployee = async (employeeId: string) => {
  const employee = await Employee.findByIdAndDelete(employeeId);
  if (!employee) {
    throw new AppError("Employee not found", 404);
  }
  return employee;
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
  updateEmployeeStatus,
  deleteEmployee,
};
