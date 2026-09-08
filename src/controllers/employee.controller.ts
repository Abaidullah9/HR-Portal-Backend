import { Request, Response } from "express";
import { sendErrorResponse } from "../utils/helper/sendError";
import employeeServices from "../services/employee.services";
import { MESSAGES } from "../utils/helper/constants/messages";
import { StatusCode } from "../utils/helper/constants/enum";
import { AppError } from "../utils/helper/AppError";
import { CreateEmployeeDTO, UpdateEmployeeDTO } from "../utils/dtos/employee.dto";
import { PaginationQuery } from "../utils/common";

const addEmployee = async (req: Request, res: Response) => {
  try {
    const body: CreateEmployeeDTO = req.body;
    const newEmployee = await employeeServices.addEmployee(body);
    if (!newEmployee) throw new AppError(MESSAGES.FAILED_TO_CREATE_EMPLOYEE, StatusCode.INTERNAL_SERVER_ERROR);
    res.status(StatusCode.CREATED).json({ success: true, message: MESSAGES.EMPLOYEE_ADDED_SUCCESSFULLY, data: newEmployee });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const getAllEmployee = async (req: Request, res: Response) => {
  try {
    const { data, pagination } = await employeeServices.getAllEmployee(req.query as PaginationQuery);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.ALL_EMPLOYEES_FETCHED_SUCCESSFULLY, data, pagination });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const getEmployeeById = async (req: Request, res: Response) => {
  try {
    const { _id } = req.params;
    const result = await employeeServices.getEmployeeById(_id as string);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.EMPLOYEE_FETCHED_SUCCESSFULLY, data: result });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const getEmployeeByUserId = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const result = await employeeServices.getEmployeeByUserId(userId as string);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.EMPLOYEE_FETCHED_SUCCESSFULLY, data: result });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const getActiveEmployees = async (req: Request, res: Response) => {
  try {
    const result = await employeeServices.getActiveEmployees();
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.ALL_EMPLOYEES_FETCHED_SUCCESSFULLY, data: result });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const getEmployeesByDepartment = async (req: Request, res: Response) => {
  try {
    const { departmentId } = req.params;
    if (!departmentId) {
      throw new AppError(MESSAGES.DEPARTMENT_ID_REQUIRED, StatusCode.BAD_REQUEST);
    }
    const result = await employeeServices.getEmployeesByDepartment(departmentId as string);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.ALL_EMPLOYEES_FETCHED_SUCCESSFULLY, data: result });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const getEmployeesByManager = async (req: Request, res: Response) => {
  try {
    const { managerId } = req.params;
    const result = await employeeServices.getEmployeesByReportingManager(managerId as string);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.ALL_EMPLOYEES_FETCHED_SUCCESSFULLY, data: result });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const updateEmployee = async (req: Request, res: Response) => {
  try {
    const { _id } = req.params;
    const updateData: UpdateEmployeeDTO = req.body;
    const result = await employeeServices.updateEmployee(_id as string, updateData);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.EMPLOYEE_UPDATED_SUCCESSFULLY, data: result });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const deleteEmployee = async (req: Request, res: Response) => {
  try {
    const { _id } = req.params;
    const deletedEmployee = await employeeServices.deleteEmployee(_id as string);
    if (!deletedEmployee) throw new AppError(MESSAGES.EMPLOYEE_NOT_FOUND, StatusCode.NOT_FOUND);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.EMPLOYEE_DELETED_SUCCESSFULLY, data: deletedEmployee });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

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
