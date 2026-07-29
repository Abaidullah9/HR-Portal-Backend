import { Request, Response } from "express";
import catchAsync from "../utils/helper/catchAsync";
import employeeServices from "../services/employee.services";
import { MESSAGES } from "../utils/helper/constants/messages";
import { StatusCode } from "../utils/helper/constants/enum";

const addEmployee = catchAsync(async (req: Request, res: Response) => {
  const result = await employeeServices.addEmployee(req.body);
  res.status(StatusCode.CREATED).json({ success: true, message: MESSAGES.EMPLOYEE_ADDED_SUCCESSFULLY, data: result });
});

const getAllEmployee = catchAsync(async (req: Request, res: Response) => {
  const result = await employeeServices.getAllEmployee(req.query as any);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.ALL_EMPLOYEES_FETCHED_SUCCESSFULLY, data: result });
});

const getEmployeeById = catchAsync(async (req: Request, res: Response) => {
  const { _id } = req.params;
  const result = await employeeServices.getEmployeeById(_id as string);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.EMPLOYEE_FETCHED_SUCCESSFULLY, data: result });
});

const getEmployeeByUserId = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const result = await employeeServices.getEmployeeByUserId(userId as string);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.EMPLOYEE_FETCHED_SUCCESSFULLY, data: result });
});

const getActiveEmployees = catchAsync(async (req: Request, res: Response) => {
  const result = await employeeServices.getActiveEmployees();
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.ALL_EMPLOYEES_FETCHED_SUCCESSFULLY, data: result });
});

const getEmployeesByDepartment = catchAsync(async (req: Request, res: Response) => {
  const { departmentId } = req.params;
  const result = await employeeServices.getEmployeesByDepartment(departmentId as string);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.ALL_EMPLOYEES_FETCHED_SUCCESSFULLY, data: result });
});

const getEmployeesByManager = catchAsync(async (req: Request, res: Response) => {
  const { managerId } = req.params;
  const result = await employeeServices.getEmployeesByReportingManager(managerId as string);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.ALL_EMPLOYEES_FETCHED_SUCCESSFULLY, data: result });
});

const updateEmployee = catchAsync(async (req: Request, res: Response) => {
  const { _id } = req.params;
  const result = await employeeServices.updateEmployee(_id as string, req.body);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.EMPLOYEE_UPDATED_SUCCESSFULLY, data: result });
});

const deleteEmployee = catchAsync(async (req: Request, res: Response) => {
  const { _id } = req.params;
  await employeeServices.deleteEmployee(_id as string);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.EMPLOYEE_DELETED_SUCCESSFULLY, data: null });
});

export default {
  addEmployee,
  getAllEmployee,
  getEmployeeById,
  getEmployeeByUserId,
  getActiveEmployees,
  getEmployeesByDepartment,
  getEmployeesByManager,
  updateEmployee,
  deleteEmployee,
};
