import { StatusCode } from "../utils/helper/constants/enum";
import { AppError } from "../utils/helper/AppError";
import reportModel from "../models/report.model";
import { CreateReportDTO } from "../utils/dtos/report.dto";
import { MESSAGES } from "../utils/helper/constants/messages";
import { getPagination, paginatedResult, PaginationQuery } from "../utils/common";

const addReport = async (reportData: CreateReportDTO) => {
  if (!reportData) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const newReport = await reportModel.create(reportData);
  return newReport;
};

const getAllReport = async (query: PaginationQuery) => {
  const { page, limit, skip } = getPagination(query);
  const allReports = await reportModel.find()
    .populate("generatedBy", "name email")
    .skip(skip)
    .limit(limit);
  const total = await reportModel.countDocuments();
  if (!allReports) throw new AppError(MESSAGES.REPORT_NOT_FOUND, StatusCode.NOT_FOUND);
  return paginatedResult(allReports, total, page, limit);
};

const getReportById = async (_id: string) => {
  if (!_id) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const reportById = await reportModel.findById(_id).populate("generatedBy", "name email");
  if (!reportById) throw new AppError(MESSAGES.REPORT_NOT_FOUND, StatusCode.NOT_FOUND);
  return reportById;
};

const getReportsByCategory = async (category: string) => {
  if (!category) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const reports = await reportModel.find({ category })
    .populate("generatedBy", "name email")
    .sort({ lastGenerated: -1 });
    if (!reports) throw new AppError(MESSAGES.REPORT_NOT_FOUND, StatusCode.NOT_FOUND);
  return reports;
};

const updateReport = async (_id: string, updateData: Partial<CreateReportDTO>) => {
  if (!_id) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const updatedReport = await reportModel.findByIdAndUpdate(_id, updateData, { returnDocument: 'after' })
    .populate("generatedBy", "name email");
  if (!updatedReport) throw new AppError(MESSAGES.REPORT_NOT_FOUND, StatusCode.NOT_FOUND);

  return updatedReport;
};

const deleteReport = async (_id: string) => {
  if (!_id) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const deletedReport = await reportModel.findByIdAndDelete(_id);

  return deletedReport;
};

export default {
  addReport,
  getAllReport,
  getReportById,
  getReportsByCategory,
  updateReport,
  deleteReport,
};
