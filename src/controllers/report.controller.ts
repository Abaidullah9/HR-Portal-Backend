import { Request, Response } from "express";
import catchAsync from "../utils/helper/catchAsync";
import reportServices from "../services/report.services";
import { MESSAGES } from "../utils/helper/constants/messages";
import { StatusCode } from "../utils/helper/constants/enum";

const addReport = catchAsync(async (req: Request, res: Response) => {
  const result = await reportServices.addReport(req.body);
  res.status(StatusCode.CREATED).json({ success: true, message: MESSAGES.REPORT_ADDED_SUCCESSFULLY, data: result });
});

const getAllReport = catchAsync(async (req: Request, res: Response) => {
  const result = await reportServices.getAllReport();
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.ALL_REPORTS_FETCHED_SUCCESSFULLY, data: result });
});

const getReportById = catchAsync(async (req: Request, res: Response) => {
  const { _id } = req.params;
  const result = await reportServices.getReportById(_id as string);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.REPORT_FETCHED_SUCCESSFULLY, data: result });
});

const getReportByCategory = catchAsync(async (req: Request, res: Response) => {
  const { category } = req.params;
  const result = await reportServices.getReportsByCategory(category as string);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.ALL_REPORTS_FETCHED_SUCCESSFULLY, data: result });
});

const updateReport = catchAsync(async (req: Request, res: Response) => {
  const { _id } = req.params;
  const result = await reportServices.updateReport(_id as string, req.body);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.REPORT_UPDATED_SUCCESSFULLY, data: result });
});

const deleteReport = catchAsync(async (req: Request, res: Response) => {
  const { _id } = req.params;
  await reportServices.deleteReport(_id as string);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.REPORT_DELETED_SUCCESSFULLY, data: null });
});

export default {
  addReport,
  getAllReport,
  getReportById,
  getReportByCategory,
  updateReport,
  deleteReport,
};
