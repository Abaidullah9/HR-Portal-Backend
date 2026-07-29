import Appraisal from "../models/appraisal.model";
import { AppError } from "../utils/helper/AppError";
import { CreateAppraisalDTO, UpdateAppraisalDTO } from "../utils/dtos/appraisal.dto";
import { getPagination, paginatedResult, PaginationQuery } from "../utils/pagination";

const addAppraisal = async (appraisalData: CreateAppraisalDTO) => {
  if (!appraisalData.employeeId || !appraisalData.cycleId || !appraisalData.appraiserId) {
    throw new AppError("Missing required fields: employeeId, cycleId, appraiserId", 400);
  }

  const existingAppraisal = await Appraisal.findOne({
    employeeId: appraisalData.employeeId,
    cycleId: appraisalData.cycleId,
  });
  if (existingAppraisal) {
    throw new AppError("Appraisal already exists for this employee in this cycle", 409);
  }

  const appraisal = await Appraisal.create(appraisalData);
  return appraisal;
};

const getAllAppraisal = async (query?: PaginationQuery) => {
  if (!query || (!query.page && !query.limit)) {
    const appraisals = await Appraisal.find()
      .populate("employeeId", "name email")
      .populate("cycleId", "name")
      .populate("appraiserId", "name email");
    return appraisals;
  }
  const { page, limit, skip } = getPagination(query);
  const [appraisals, total] = await Promise.all([
    Appraisal.find()
      .skip(skip).limit(limit)
      .populate("employeeId", "name email")
      .populate("cycleId", "name")
      .populate("appraiserId", "name email"),
    Appraisal.countDocuments(),
  ]);
  return paginatedResult(appraisals, total, page, limit);
};

const getAppraisalById = async (appraisalId: string) => {
  const appraisal = await Appraisal.findById(appraisalId)
    .populate("employeeId", "name email")
    .populate("cycleId", "name")
    .populate("appraiserId", "name email");
  if (!appraisal) {
    throw new AppError("Appraisal not found", 404);
  }
  return appraisal;
};

const getAppraisalsByEmployee = async (employeeId: string) => {
  const appraisals = await Appraisal.find({ employeeId })
    .populate("cycleId", "name")
    .populate("appraiserId", "name email");
  return appraisals;
};

const getAppraisalsByCycle = async (cycleId: string) => {
  const appraisals = await Appraisal.find({ cycleId })
    .populate("employeeId", "name email")
    .populate("appraiserId", "name email");
  return appraisals;
};

const updateAppraisal = async (appraisalId: string, updateData: UpdateAppraisalDTO) => {
  const appraisal = await Appraisal.findByIdAndUpdate(appraisalId, updateData, { new: true, runValidators: true })
    .populate("employeeId", "name email")
    .populate("cycleId", "name")
    .populate("appraiserId", "name email");
  if (!appraisal) {
    throw new AppError("Appraisal not found", 404);
  }
  return appraisal;
};

const updateAppraisalStatus = async (appraisalId: string, status: 'pending' | 'completed') => {
  const appraisal = await Appraisal.findByIdAndUpdate(appraisalId, { status }, { new: true })
    .populate("employeeId", "name email")
    .populate("cycleId", "name")
    .populate("appraiserId", "name email");
  if (!appraisal) {
    throw new AppError("Appraisal not found", 404);
  }
  return appraisal;
};

const deleteAppraisal = async (appraisalId: string) => {
  const appraisal = await Appraisal.findByIdAndDelete(appraisalId);
  if (!appraisal) {
    throw new AppError("Appraisal not found", 404);
  }
  return appraisal;
};

export default {
  addAppraisal,
  getAllAppraisal,
  getAppraisalById,
  getAppraisalsByEmployee,
  getAppraisalsByCycle,
  updateAppraisal,
  updateAppraisalStatus,
  deleteAppraisal,
};
