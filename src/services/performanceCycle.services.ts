import { StatusCode } from "../utils/helper/constants/enum";
import { AppError } from "../utils/helper/AppError";
import performanceCycleModel from "../models/performanceCycle.model";
import { CreatePerformanceCycleDTO } from "../utils/dtos/performanceCycle.dto";
import { MESSAGES } from "../utils/helper/constants/messages";
import { getPagination, paginatedResult, PaginationQuery } from "../utils/common";

const addPerformanceCycle = async (cycleData: CreatePerformanceCycleDTO) => {
  if (!cycleData) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const newCycle = await performanceCycleModel.create(cycleData);
  return newCycle;
};

const getAllPerformanceCycle = async (query: PaginationQuery) => {
  const { page, limit, skip } = getPagination(query);
  const allCycles = await performanceCycleModel.find().sort({ startDate: -1 }).skip(skip).limit(limit);
  const total = await performanceCycleModel.countDocuments();
  if (!allCycles) throw new AppError(MESSAGES.PERFORMANCE_CYCLE_NOT_FOUND, StatusCode.NOT_FOUND);
  return paginatedResult(allCycles, total, page, limit);
};

const getPerformanceCycleById = async (_id: string) => {
  if (!_id) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const cycleById = await performanceCycleModel.findById(_id);
  if (!cycleById) throw new AppError(MESSAGES.PERFORMANCE_CYCLE_NOT_FOUND, StatusCode.NOT_FOUND);
  return cycleById;
};

const getActivePerformanceCycle = async () => {
  const cycle = await performanceCycleModel.findOne({ status: 'active' });
  if (!cycle) throw new AppError(MESSAGES.PERFORMANCE_CYCLE_NOT_FOUND, StatusCode.NOT_FOUND);
  return cycle;
};

const getUpcomingPerformanceCycles = async () => {
  const cycles = await performanceCycleModel.find({ status: 'upcoming' }).sort({ startDate: 1 });
  if (!cycles) throw new AppError(MESSAGES.PERFORMANCE_CYCLE_NOT_FOUND, StatusCode.NOT_FOUND);
  return cycles;
};

const updatePerformanceCycle = async (_id: string, updateData: Partial<CreatePerformanceCycleDTO>) => {
  if (!_id) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const updatedCycle = await performanceCycleModel.findByIdAndUpdate(_id, updateData, { returnDocument: 'after' });
  if (!updatedCycle) throw new AppError(MESSAGES.PERFORMANCE_CYCLE_NOT_FOUND, StatusCode.NOT_FOUND);

  return updatedCycle;
};

const updatePerformanceCycleStatus = async (_id: string, status: string) => {
  if (!_id || !status) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const updatedCycle = await performanceCycleModel.findByIdAndUpdate(_id, { status }, { returnDocument: 'after' });
  if (!updatedCycle) throw new AppError(MESSAGES.PERFORMANCE_CYCLE_NOT_FOUND, StatusCode.NOT_FOUND);

  return updatedCycle;
};

const deletePerformanceCycle = async (_id: string) => {
  if (!_id) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const deletedCycle = await performanceCycleModel.findByIdAndDelete(_id);

  return deletedCycle;
};

export default {
  addPerformanceCycle,
  getAllPerformanceCycle,
  getPerformanceCycleById,
  getActivePerformanceCycle,
  getUpcomingPerformanceCycles,
  updatePerformanceCycle,
  updatePerformanceCycleStatus,
  deletePerformanceCycle,
};
