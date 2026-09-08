import { Request, Response } from "express";
import { sendErrorResponse } from "../utils/helper/sendError";
import feedbackServices from "../services/feedback.services";
import { MESSAGES } from "../utils/helper/constants/messages";
import { StatusCode } from "../utils/helper/constants/enum";
import { AppError } from "../utils/helper/AppError";
import { CreateFeedbackDTO, UpdateFeedbackDTO } from "../utils/dtos/feedback.dto";
import { PaginationQuery } from "../utils/common";

const addFeedback = async (req: Request, res: Response) => {
  try {
    const body: CreateFeedbackDTO = req.body;
    const newFeedback = await feedbackServices.addFeedback(body);
    if (!newFeedback) throw new AppError(MESSAGES.FAILED_TO_CREATE_FEEDBACK, StatusCode.INTERNAL_SERVER_ERROR);
    res.status(StatusCode.CREATED).json({ success: true, message: MESSAGES.FEEDBACK_ADDED_SUCCESSFULLY, data: newFeedback });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const getAllFeedback = async (req: Request, res: Response) => {
  try {
    const { data, pagination } = await feedbackServices.getAllFeedback(req.query as PaginationQuery);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.ALL_FEEDBACK_FETCHED_SUCCESSFULLY, data, pagination });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const getFeedbackById = async (req: Request, res: Response) => {
  try {
    const { _id } = req.params;
    const result = await feedbackServices.getFeedbackById(_id as string);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.FEEDBACK_FETCHED_SUCCESSFULLY, data: result });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const getFeedbackByTargetEmployee = async (req: Request, res: Response) => {
  try {
    const { targetEmployeeId } = req.params;
    const result = await feedbackServices.getFeedbackByTargetEmployee(targetEmployeeId as string);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.FEEDBACK_FETCHED_SUCCESSFULLY, data: result });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const getFeedbackByReviewer = async (req: Request, res: Response) => {
  try {
    const { reviewerId } = req.params;
    const result = await feedbackServices.getFeedbackByReviewer(reviewerId as string);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.FEEDBACK_FETCHED_SUCCESSFULLY, data: result });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const getFeedbackByCycle = async (req: Request, res: Response) => {
  try {
    const { cycleId } = req.params;
    const result = await feedbackServices.getFeedbackByCycle(cycleId as string);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.FEEDBACK_FETCHED_SUCCESSFULLY, data: result });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const updateFeedback = async (req: Request, res: Response) => {
  try {
    const { _id } = req.params;
    const updateData: UpdateFeedbackDTO = req.body;
    const result = await feedbackServices.updateFeedback(_id as string, updateData);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.FEEDBACK_UPDATED_SUCCESSFULLY, data: result });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const deleteFeedback = async (req: Request, res: Response) => {
  try {
    const { _id } = req.params;
    const deletedFeedback = await feedbackServices.deleteFeedback(_id as string);
    if (!deletedFeedback) throw new AppError(MESSAGES.FEEDBACK_NOT_FOUND, StatusCode.NOT_FOUND);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.FEEDBACK_DELETED_SUCCESSFULLY, data: deletedFeedback });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

export default {
  addFeedback,
  getAllFeedback,
  getFeedbackById,
  getFeedbackByTargetEmployee,
  getFeedbackByReviewer,
  getFeedbackByCycle,
  updateFeedback,
  deleteFeedback,
};
