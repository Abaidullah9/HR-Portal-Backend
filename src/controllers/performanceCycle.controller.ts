import { Request, Response } from "express";
import catchAsync from "../utils/helper/catchAsync";
import performanceCycleServices from "../services/performanceCycle.services";
import { MESSAGES } from "../utils/helper/constants/messages";
import { StatusCode } from "../utils/helper/constants/enum";

const addPerformanceCycle = catchAsync(async (req: Request, res: Response) => {
  const result = await performanceCycleServices.addPerformanceCycle(req.body);
  res.status(StatusCode.CREATED).json({ success: true, message: MESSAGES.PERFORMANCE_CYCLE_ADDED_SUCCESSFULLY, data: result });
});

const getAllPerformanceCycle = catchAsync(async (req: Request, res: Response) => {
  const result = await performanceCycleServices.getAllPerformanceCycle();
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.ALL_PERFORMANCE_CYCLES_FETCHED_SUCCESSFULLY, data: result });
});

const getPerformanceCycleById = catchAsync(async (req: Request, res: Response) => {
  const { _id } = req.params;
  const result = await performanceCycleServices.getPerformanceCycleById(_id as string);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.PERFORMANCE_CYCLE_FETCHED_SUCCESSFULLY, data: result });
});

const getActivePerformanceCycle = catchAsync(async (req: Request, res: Response) => {
  const result = await performanceCycleServices.getActivePerformanceCycle();
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.PERFORMANCE_CYCLE_FETCHED_SUCCESSFULLY, data: result });
});

const getUpcomingPerformanceCycles = catchAsync(async (req: Request, res: Response) => {
  const result = await performanceCycleServices.getUpcomingPerformanceCycles();
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.ALL_PERFORMANCE_CYCLES_FETCHED_SUCCESSFULLY, data: result });
});

const updatePerformanceCycle = catchAsync(async (req: Request, res: Response) => {
  const { _id } = req.params;
  const result = await performanceCycleServices.updatePerformanceCycle(_id as string, req.body);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.PERFORMANCE_CYCLE_UPDATED_SUCCESSFULLY, data: result });
});

const updatePerformanceCycleStatus = catchAsync(async (req: Request, res: Response) => {
  const { _id } = req.params;
  const { status } = req.body;
  const result = await performanceCycleServices.updatePerformanceCycleStatus(_id as string, status);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.PERFORMANCE_CYCLE_UPDATED_SUCCESSFULLY, data: result });
});

const deletePerformanceCycle = catchAsync(async (req: Request, res: Response) => {
  const { _id } = req.params;
  await performanceCycleServices.deletePerformanceCycle(_id as string);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.PERFORMANCE_CYCLE_DELETED_SUCCESSFULLY, data: null });
});

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
