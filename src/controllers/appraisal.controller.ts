import { Request, Response } from "express";
import catchAsync from "../utils/helper/catchAsync";
import appraisalServices from "../services/appraisal.services";
import { MESSAGES } from "../utils/helper/constants/messages";
import { StatusCode } from "../utils/helper/constants/enum";

const addAppraisal = catchAsync(async (req: Request, res: Response) => {
  const result = await appraisalServices.addAppraisal(req.body);
  res.status(StatusCode.CREATED).json({ success: true, message: MESSAGES.APPRAISAL_ADDED_SUCCESSFULLY, data: result });
});

const getAllAppraisal = catchAsync(async (req: Request, res: Response) => {
  const result = await appraisalServices.getAllAppraisal();
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.ALL_APPRAISALS_FETCHED_SUCCESSFULLY, data: result });
});

const getAppraisalById = catchAsync(async (req: Request, res: Response) => {
  const { _id } = req.params;
  const result = await appraisalServices.getAppraisalById(_id as string);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.APPRAISAL_FETCHED_SUCCESSFULLY, data: result });
});

const getAppraisalByEmployee = catchAsync(async (req: Request, res: Response) => {
  const { employeeId } = req.params;
  const result = await appraisalServices.getAppraisalsByEmployee(employeeId as string);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.ALL_APPRAISALS_FETCHED_SUCCESSFULLY, data: result });
});

const getAppraisalByCycle = catchAsync(async (req: Request, res: Response) => {
  const { cycleId } = req.params;
  const result = await appraisalServices.getAppraisalsByCycle(cycleId as string);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.ALL_APPRAISALS_FETCHED_SUCCESSFULLY, data: result });
});

const updateAppraisal = catchAsync(async (req: Request, res: Response) => {
  const { _id } = req.params;
  const result = await appraisalServices.updateAppraisal(_id as string, req.body);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.APPRAISAL_UPDATED_SUCCESSFULLY, data: result });
});

const updateAppraisalStatus = catchAsync(async (req: Request, res: Response) => {
  const { _id } = req.params;
  const { status } = req.body;
  const result = await appraisalServices.updateAppraisalStatus(_id as string, status);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.APPRAISAL_UPDATED_SUCCESSFULLY, data: result });
});

const deleteAppraisal = catchAsync(async (req: Request, res: Response) => {
  const { _id } = req.params;
  await appraisalServices.deleteAppraisal(_id as string);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.APPRAISAL_DELETED_SUCCESSFULLY, data: null });
});

export default {
  addAppraisal,
  getAllAppraisal,
  getAppraisalById,
  getAppraisalByEmployee,
  getAppraisalByCycle,
  updateAppraisal,
  updateAppraisalStatus,
  deleteAppraisal,
};
