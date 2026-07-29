import Report from "../models/report.model";
import { AppError } from "../utils/helper/AppError";
import { CreateReportDTO, UpdateReportDTO } from "../utils/dtos/report.dto";
import { getPagination, paginatedResult, PaginationQuery } from "../utils/pagination";

const addReport = async (reportData: CreateReportDTO) => {
  if (!reportData.reportName || !reportData.category || !reportData.generatedBy) {
    throw new AppError("Missing required fields: reportName, category, generatedBy", 400);
  }

  const report = await Report.create(reportData);
  return report;
};

const getAllReport = async (query?: PaginationQuery) => {
  if (!query || (!query.page && !query.limit)) {
    const reports = await Report.find()
      .populate("generatedBy", "name email")
      .sort({ lastGenerated: -1 });
    return reports;
  }
  const { page, limit, skip } = getPagination(query);
  const [reports, total] = await Promise.all([
    Report.find().skip(skip).limit(limit)
      .populate("generatedBy", "name email")
      .sort({ lastGenerated: -1 }),
    Report.countDocuments(),
  ]);
  return paginatedResult(reports, total, page, limit);
};

const getReportById = async (reportId: string) => {
  const report = await Report.findById(reportId)
    .populate("generatedBy", "name email");
  if (!report) {
    throw new AppError("Report not found", 404);
  }
  return report;
};

const getReportsByCategory = async (category: string) => {
  const reports = await Report.find({ category })
    .populate("generatedBy", "name email")
    .sort({ lastGenerated: -1 });
  return reports;
};

const updateReport = async (reportId: string, updateData: UpdateReportDTO) => {
  const report = await Report.findByIdAndUpdate(reportId, updateData, { new: true, runValidators: true })
    .populate("generatedBy", "name email");
  if (!report) {
    throw new AppError("Report not found", 404);
  }
  return report;
};

const deleteReport = async (reportId: string) => {
  const report = await Report.findByIdAndDelete(reportId);
  if (!report) {
    throw new AppError("Report not found", 404);
  }
  return report;
};

export default {
  addReport,
  getAllReport,
  getReportById,
  getReportsByCategory,
  updateReport,
  deleteReport,
};
