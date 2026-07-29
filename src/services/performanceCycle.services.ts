import PerformanceCycle from "../models/performanceCycle.model";
import { AppError } from "../utils/helper/AppError";
import { CreatePerformanceCycleDTO, UpdatePerformanceCycleDTO } from "../utils/dtos/performanceCycle.dto";
import { getPagination, paginatedResult, PaginationQuery } from "../utils/pagination";

const addPerformanceCycle = async (cycleData: CreatePerformanceCycleDTO) => {
  if (!cycleData.name || !cycleData.startDate || !cycleData.endDate) {
    throw new AppError("Missing required fields: name, startDate, endDate", 400);
  }

  if (new Date(cycleData.startDate) >= new Date(cycleData.endDate)) {
    throw new AppError("Start date must be before end date", 400);
  }

  const existingCycle = await PerformanceCycle.findOne({ name: cycleData.name });
  if (existingCycle) {
    throw new AppError("Performance cycle with this name already exists", 409);
  }

  const cycle = await PerformanceCycle.create(cycleData);
  return cycle;
};

const getAllPerformanceCycle = async (query?: PaginationQuery) => {
  if (!query || (!query.page && !query.limit)) {
    const cycles = await PerformanceCycle.find().sort({ startDate: -1 });
    return cycles;
  }
  const { page, limit, skip } = getPagination(query);
  const [cycles, total] = await Promise.all([
    PerformanceCycle.find().skip(skip).limit(limit).sort({ startDate: -1 }),
    PerformanceCycle.countDocuments(),
  ]);
  return paginatedResult(cycles, total, page, limit);
};

const getPerformanceCycleById = async (cycleId: string) => {
  const cycle = await PerformanceCycle.findById(cycleId);
  if (!cycle) {
    throw new AppError("Performance cycle not found", 404);
  }
  return cycle;
};

const getActivePerformanceCycle = async () => {
  const cycle = await PerformanceCycle.findOne({ status: 'active' });
  return cycle;
};

const getUpcomingPerformanceCycles = async () => {
  const cycles = await PerformanceCycle.find({ status: 'upcoming' }).sort({ startDate: 1 });
  return cycles;
};

const updatePerformanceCycle = async (cycleId: string, updateData: UpdatePerformanceCycleDTO) => {
  if (updateData.name) {
    const existingCycle = await PerformanceCycle.findOne({ name: updateData.name });
    if (existingCycle && existingCycle._id.toString() !== cycleId) {
      throw new AppError("Performance cycle with this name already exists", 409);
    }
  }

  const cycle = await PerformanceCycle.findByIdAndUpdate(cycleId, updateData, { new: true, runValidators: true });
  if (!cycle) {
    throw new AppError("Performance cycle not found", 404);
  }
  return cycle;
};

const updatePerformanceCycleStatus = async (cycleId: string, status: 'upcoming' | 'active' | 'completed') => {
  const cycle = await PerformanceCycle.findByIdAndUpdate(cycleId, { status }, { new: true });
  if (!cycle) {
    throw new AppError("Performance cycle not found", 404);
  }
  return cycle;
};

const deletePerformanceCycle = async (cycleId: string) => {
  const cycle = await PerformanceCycle.findByIdAndDelete(cycleId);
  if (!cycle) {
    throw new AppError("Performance cycle not found", 404);
  }
  return cycle;
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
