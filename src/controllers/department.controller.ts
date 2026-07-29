import { Request, Response } from "express";
import catchAsync from "../utils/helper/catchAsync";
import departmentServices from "../services/department.services";
import { MESSAGES } from "../utils/helper/constants/messages";
import { StatusCode } from "../utils/helper/constants/enum";

const addDepartment = catchAsync(async (req: Request, res: Response) => {
  const result = await departmentServices.addDepartment(req.body);
  res.status(StatusCode.CREATED).json({ success: true, message: MESSAGES.DEPARTMENT_ADDED_SUCCESSFULLY, data: result });
});

const getAllDepartment = catchAsync(async (req: Request, res: Response) => {
  const result = await departmentServices.getAllDepartment(req.query as any);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.ALL_DEPARTMENTS_FETCHED_SUCCESSFULLY, data: result });
});

const getDepartmentById = catchAsync(async (req: Request, res: Response) => {
  const { _id } = req.params;
  const result = await departmentServices.getDepartmentById(_id as string);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.DEPARTMENT_FETCHED_SUCCESSFULLY, data: result });
});

const getDepartmentChildren = catchAsync(async (req: Request, res: Response) => {
  const { _id } = req.params;
  const result = await departmentServices.getChildDepartments(_id as string);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.ALL_DEPARTMENTS_FETCHED_SUCCESSFULLY, data: result });
});

const updateDepartment = catchAsync(async (req: Request, res: Response) => {
  const { _id } = req.params;
  const result = await departmentServices.updateDepartment(_id as string, req.body);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.DEPARTMENT_UPDATED_SUCCESSFULLY, data: result });
});

const deleteDepartment = catchAsync(async (req: Request, res: Response) => {
  const { _id } = req.params;
  await departmentServices.deleteDepartment(_id as string);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.DEPARTMENT_DELETED_SUCCESSFULLY, data: null });
});

export default {
  addDepartment,
  getAllDepartment,
  getDepartmentById,
  getDepartmentChildren,
  updateDepartment,
  deleteDepartment,
};
