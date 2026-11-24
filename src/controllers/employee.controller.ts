import { Request, Response } from "express";
import { sendErrorResponse } from "../utils/helper/sendError";
import employeeServices from "../services/employee.services";
import { MESSAGES } from "../utils/helper/constants/messages";
import { StatusCode } from "../utils/helper/constants/enum";
import { AppError } from "../utils/helper/AppError";
import { CreateEmployeeDTO, UpdateEmployeeDTO } from "../utils/dtos/employee.dto";
import { PaginationQuery } from "../utils/common";
import { recordAudit } from "../utils/helper/audit";
import { canAccessEmployee, resolveReadScope } from "../utils/helper/ownership";
import type { ImportEmployeeRow } from "../services/employee.services";

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
    const { data, pagination } = await employeeServices.getAllEmployee(
      req.query as PaginationQuery & { search?: string },
    );
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

const orgChart = async (_req: Request, res: Response) => {
  try {
    const data = await employeeServices.orgChart();
    res.status(StatusCode.OK).json({ success: true, message: 'Org chart fetched', data });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

/** Full employee view: profile, documents, pay history, leave, reviews, tasks. */
const getEmployeeProfile = async (req: Request, res: Response) => {
  try {
    const scope = await resolveReadScope(req.userId!);
    const data = await employeeServices.getEmployeeProfile(req.params._id as string, scope);
    res.status(StatusCode.OK).json({ success: true, message: 'Employee profile fetched', data });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

/** Self-service profile: the employee is derived from the session. */
const getOwnProfile = async (req: Request, res: Response) => {
  try {
    const scope = await resolveReadScope(req.userId!);
    if (!scope.ownEmployeeId) {
      throw new AppError('No employee record is linked to your account yet', StatusCode.NOT_FOUND);
    }
    const data = await employeeServices.getEmployeeProfile(scope.ownEmployeeId, scope);
    res.status(StatusCode.OK).json({ success: true, message: 'Employee profile fetched', data });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const exportEmployeeData = async (req: Request, res: Response) => {
  try {
    const employeeId = req.params._id as string;
    const scope = await resolveReadScope(req.userId!);
    if (!canAccessEmployee(scope, employeeId)) {
      throw new AppError(MESSAGES.NOT_AUTHORIZED, StatusCode.FORBIDDEN);
    }
    const data = await employeeServices.exportEmployeeData(employeeId);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="employee-${employeeId}-export.json"`);
    res.setHeader('Cache-Control', 'private, no-store');
    res.send(JSON.stringify(data, null, 2));
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const anonymizeEmployee = async (req: Request, res: Response) => {
  try {
    const data = await employeeServices.anonymizeEmployee(req.params._id as string, req.userId);
    await recordAudit(req.userId, {
      action: 'employee.anonymize',
      entity: 'Employee',
      entityId: req.params._id as string,
      detail: 'GDPR erasure request: identifying fields replaced',
    }, res);
    res.status(StatusCode.OK).json({ success: true, message: 'Employee data erased', data });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const importEmployees = async (req: Request, res: Response) => {
  try {
    const rows = Array.isArray(req.body?.rows) ? (req.body.rows as ImportEmployeeRow[]) : [];
    const data = await employeeServices.importEmployees(rows);
    res.status(StatusCode.CREATED).json({ success: true, message: 'Import finished', data });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const deleteEmployee = async (req: Request, res: Response) => {
  try {
    const { _id } = req.params;
    const deletedEmployee = await employeeServices.deleteEmployee(_id as string);
    if (!deletedEmployee) throw new AppError(MESSAGES.EMPLOYEE_NOT_FOUND, StatusCode.NOT_FOUND);
    await recordAudit(req.userId, {
      action: 'employee.delete',
      entity: 'Employee',
      entityId: _id as string,
      detail: deletedEmployee.name,
    }, res);
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
  orgChart,
  getEmployeeProfile,
  getOwnProfile,
  exportEmployeeData,
  anonymizeEmployee,
  importEmployees,
  updateEmployee,
  deleteEmployee,
};
