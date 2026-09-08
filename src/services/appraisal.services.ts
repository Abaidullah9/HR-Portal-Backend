import { StatusCode } from "../utils/helper/constants/enum";
import { AppError } from "../utils/helper/AppError";
import appraisalModel from "../models/appraisal.model";
import { CreateAppraisalDTO } from "../utils/dtos/appraisal.dto";
import { MESSAGES } from "../utils/helper/constants/messages";
import { getPagination, paginatedResult, PaginationQuery } from "../utils/common";

const addAppraisal = async (appraisalData: CreateAppraisalDTO) => {
  if (!appraisalData) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const newAppraisal = await appraisalModel.create(appraisalData);
  return newAppraisal;
};

const getAllAppraisal = async (query: PaginationQuery) => {
  const { page, limit, skip } = getPagination(query);
  const allAppraisals = await appraisalModel.find()
    .populate("employeeId", "name email")
    .populate("cycleId", "name")
    .populate("appraiserId", "name email")
    .skip(skip)
    .limit(limit);
  const total = await appraisalModel.countDocuments();
  return paginatedResult(allAppraisals, total, page, limit);
};

const getAppraisalById = async (_id: string) => {
  if (!_id) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const appraisalById = await appraisalModel.findById(_id)
    .populate("employeeId", "name email")
    .populate("cycleId", "name")
    .populate("appraiserId", "name email");
  if (!appraisalById) throw new AppError(MESSAGES.APPRAISAL_NOT_FOUND, StatusCode.NOT_FOUND);
  return appraisalById;
};

const getAppraisalsByEmployee = async (employeeId: string) => {
  if (!employeeId) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const appraisals = await appraisalModel.find({ employeeId })
    .populate("cycleId", "name")
    .populate("appraiserId", "name email");
    if(!appraisals) throw new AppError(MESSAGES.APPRAISAL_NOT_FOUND, StatusCode.NOT_FOUND);
  return appraisals;
};

const getAppraisalsByCycle = async (cycleId: string) => {
  if (!cycleId) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const appraisals = await appraisalModel.find({ cycleId })
    .populate("employeeId", "name email")
    .populate("appraiserId", "name email");
    if(!appraisals) throw new AppError(MESSAGES.APPRAISAL_NOT_FOUND, StatusCode.NOT_FOUND); 
  return appraisals;
};

const updateAppraisal = async (_id: string, updateData: Partial<CreateAppraisalDTO>) => {
  if (!_id) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const updatedAppraisal = await appraisalModel.findByIdAndUpdate(_id, updateData, { returnDocument: 'after' })
    .populate("employeeId", "name email")
    .populate("cycleId", "name")
    .populate("appraiserId", "name email");
  if (!updatedAppraisal) throw new AppError(MESSAGES.APPRAISAL_NOT_FOUND, StatusCode.NOT_FOUND);

  return updatedAppraisal;
};

const updateAppraisalStatus = async (_id: string, status: string) => {
  if (!_id) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);
  if (!status) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const updatedAppraisal = await appraisalModel.findByIdAndUpdate(_id, { status }, { returnDocument: 'after' })
    .populate("employeeId", "name email")
    .populate("cycleId", "name")
    .populate("appraiserId", "name email");
  if (!updatedAppraisal) throw new AppError(MESSAGES.APPRAISAL_NOT_FOUND, StatusCode.NOT_FOUND);

  return updatedAppraisal;
};

const deleteAppraisal = async (_id: string) => {
  if (!_id) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const deletedAppraisal = await appraisalModel.findByIdAndDelete(_id);

  return deletedAppraisal;
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
