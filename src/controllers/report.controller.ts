import { Request, Response } from "express";
import { sendErrorResponse } from "../utils/helper/sendError";
import reportServices from "../services/report.services";
import { MESSAGES } from "../utils/helper/constants/messages";
import { StatusCode } from "../utils/helper/constants/enum";
import { AppError } from "../utils/helper/AppError";
import { CreateReportDTO, UpdateReportDTO } from "../utils/dtos/report.dto";
import { PaginationQuery } from "../utils/common";

const addReport = async (req: Request, res: Response) => {
  try {
    // generatedBy always comes from the authenticated user, never the client body
    const body: CreateReportDTO = { ...req.body, generatedBy: req.userId! };
    const newReport = await reportServices.addReport(body);
    if (!newReport) throw new AppError(MESSAGES.FAILED_TO_CREATE_REPORT, StatusCode.INTERNAL_SERVER_ERROR);
    res.status(StatusCode.CREATED).json({ success: true, message: MESSAGES.REPORT_ADDED_SUCCESSFULLY, data: newReport });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const getAllReport = async (req: Request, res: Response) => {
  try {
    const { data, pagination } = await reportServices.getAllReport(req.query as PaginationQuery);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.ALL_REPORTS_FETCHED_SUCCESSFULLY, data, pagination });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const getReportById = async (req: Request, res: Response) => {
  try {
    const { _id } = req.params;
    const result = await reportServices.getReportById(_id as string);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.REPORT_FETCHED_SUCCESSFULLY, data: result });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const getReportByCategory = async (req: Request, res: Response) => {
  try {
    const { category } = req.params;
    const result = await reportServices.getReportsByCategory(category as string);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.ALL_REPORTS_FETCHED_SUCCESSFULLY, data: result });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const updateReport = async (req: Request, res: Response) => {
  try {
    const { _id } = req.params;
    const updateData: UpdateReportDTO = req.body;
    const result = await reportServices.updateReport(_id as string, updateData);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.REPORT_UPDATED_SUCCESSFULLY, data: result });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const deleteReport = async (req: Request, res: Response) => {
  try {
    const { _id } = req.params;
    const deletedReport = await reportServices.deleteReport(_id as string);
    if (!deletedReport) throw new AppError(MESSAGES.REPORT_NOT_FOUND, StatusCode.NOT_FOUND);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.REPORT_DELETED_SUCCESSFULLY, data: deletedReport });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

export default {
  addReport,
  getAllReport,
  getReportById,
  getReportByCategory,
  updateReport,
  deleteReport,
};
