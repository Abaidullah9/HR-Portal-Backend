import { Request, Response } from "express";
import { sendErrorResponse } from "../utils/helper/sendError";
import departmentServices from "../services/department.services";
import { MESSAGES } from "../utils/helper/constants/messages";
import { StatusCode } from "../utils/helper/constants/enum";
import { AppError } from "../utils/helper/AppError";
import { CreateDepartmentDTO, UpdateDepartmentDTO } from "../utils/dtos/department.dto";
import { PaginationQuery } from "../utils/common";

const addDepartment = async (req: Request, res: Response) => {
  try {
    const body: CreateDepartmentDTO = req.body;
    const newDepartment = await departmentServices.addDepartment(body);
    if (!newDepartment) throw new AppError(MESSAGES.FAILED_TO_CREATE_DEPARTMENT, StatusCode.INTERNAL_SERVER_ERROR);
    res.status(StatusCode.CREATED).json({ success: true, message: MESSAGES.DEPARTMENT_ADDED_SUCCESSFULLY, data: newDepartment });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const getAllDepartment = async (req: Request, res: Response) => {
  try {
    const { data, pagination } = await departmentServices.getAllDepartment(req.query as PaginationQuery);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.ALL_DEPARTMENTS_FETCHED_SUCCESSFULLY, data, pagination });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const getDepartmentById = async (req: Request, res: Response) => {
  try {
    const { _id } = req.params;
    const result = await departmentServices.getDepartmentById(_id as string);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.DEPARTMENT_FETCHED_SUCCESSFULLY, data: result });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const getDepartmentChildren = async (req: Request, res: Response) => {
  try {
    const { _id } = req.params;
    const result = await departmentServices.getChildDepartments(_id as string);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.ALL_DEPARTMENTS_FETCHED_SUCCESSFULLY, data: result });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const updateDepartment = async (req: Request, res: Response) => {
  try {
    const { _id } = req.params;
    const updateData: UpdateDepartmentDTO = req.body;
    const result = await departmentServices.updateDepartment(_id as string, updateData);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.DEPARTMENT_UPDATED_SUCCESSFULLY, data: result });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const deleteDepartment = async (req: Request, res: Response) => {
  try {
    const { _id } = req.params;
    const deletedDepartment = await departmentServices.deleteDepartment(_id as string);
    if (!deletedDepartment) throw new AppError(MESSAGES.DEPARTMENT_NOT_FOUND, StatusCode.NOT_FOUND);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.DEPARTMENT_DELETED_SUCCESSFULLY, data: deletedDepartment });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

export default {
  addDepartment,
  getAllDepartment,
  getDepartmentById,
  getDepartmentChildren,
  updateDepartment,
  deleteDepartment,
};
