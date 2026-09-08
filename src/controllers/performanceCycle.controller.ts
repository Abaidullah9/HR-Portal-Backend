import { Request, Response } from "express";
import { sendErrorResponse } from "../utils/helper/sendError";
import performanceCycleServices from "../services/performanceCycle.services";
import { MESSAGES } from "../utils/helper/constants/messages";
import { StatusCode } from "../utils/helper/constants/enum";
import { AppError } from "../utils/helper/AppError";
import { CreatePerformanceCycleDTO, UpdatePerformanceCycleDTO } from "../utils/dtos/performanceCycle.dto";
import { PaginationQuery } from "../utils/common";

const addPerformanceCycle = async (req: Request, res: Response) => {
  try {
    const body: CreatePerformanceCycleDTO = req.body;
    const newCycle = await performanceCycleServices.addPerformanceCycle(body);
    if (!newCycle) throw new AppError(MESSAGES.FAILED_TO_CREATE_PERFORMANCE_CYCLE, StatusCode.INTERNAL_SERVER_ERROR);
    res.status(StatusCode.CREATED).json({ success: true, message: MESSAGES.PERFORMANCE_CYCLE_ADDED_SUCCESSFULLY, data: newCycle });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const getAllPerformanceCycle = async (req: Request, res: Response) => {
  try {
    const { data, pagination } = await performanceCycleServices.getAllPerformanceCycle(req.query as PaginationQuery);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.ALL_PERFORMANCE_CYCLES_FETCHED_SUCCESSFULLY, data, pagination });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const getPerformanceCycleById = async (req: Request, res: Response) => {
  try {
    const { _id } = req.params;
    const result = await performanceCycleServices.getPerformanceCycleById(_id as string);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.PERFORMANCE_CYCLE_FETCHED_SUCCESSFULLY, data: result });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const getActivePerformanceCycle = async (req: Request, res: Response) => {
  try {
    const result = await performanceCycleServices.getActivePerformanceCycle();
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.PERFORMANCE_CYCLE_FETCHED_SUCCESSFULLY, data: result });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const getUpcomingPerformanceCycles = async (req: Request, res: Response) => {
  try {
    const result = await performanceCycleServices.getUpcomingPerformanceCycles();
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.ALL_PERFORMANCE_CYCLES_FETCHED_SUCCESSFULLY, data: result });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const updatePerformanceCycle = async (req: Request, res: Response) => {
  try {
    const { _id } = req.params;
    const updateData: UpdatePerformanceCycleDTO = req.body;
    const result = await performanceCycleServices.updatePerformanceCycle(_id as string, updateData);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.PERFORMANCE_CYCLE_UPDATED_SUCCESSFULLY, data: result });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const updatePerformanceCycleStatus = async (req: Request, res: Response) => {
  try {
    const { _id } = req.params;
    const { status }: { status: string } = req.body;
    const result = await performanceCycleServices.updatePerformanceCycleStatus(_id as string, status as 'upcoming' | 'active' | 'completed');
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.PERFORMANCE_CYCLE_UPDATED_SUCCESSFULLY, data: result });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const deletePerformanceCycle = async (req: Request, res: Response) => {
  try {
    const { _id } = req.params;
    const deletedPerformanceCycle = await performanceCycleServices.deletePerformanceCycle(_id as string);
    if (!deletedPerformanceCycle) throw new AppError(MESSAGES.PERFORMANCE_CYCLE_NOT_FOUND, StatusCode.NOT_FOUND);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.PERFORMANCE_CYCLE_DELETED_SUCCESSFULLY, data: deletedPerformanceCycle });
  } catch (error) {
    sendErrorResponse(res, error);
  }
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
