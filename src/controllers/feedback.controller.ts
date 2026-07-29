import { Request, Response } from "express";
import catchAsync from "../utils/helper/catchAsync";
import feedbackServices from "../services/feedback.services";
import { MESSAGES } from "../utils/helper/constants/messages";
import { StatusCode } from "../utils/helper/constants/enum";

const addFeedback = catchAsync(async (req: Request, res: Response) => {
  const result = await feedbackServices.addFeedback(req.body);
  res.status(StatusCode.CREATED).json({ success: true, message: MESSAGES.FEEDBACK_ADDED_SUCCESSFULLY, data: result });
});

const getFeedbackById = catchAsync(async (req: Request, res: Response) => {
  const { _id } = req.params;
  const result = await feedbackServices.getFeedbackById(_id as string);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.FEEDBACK_FETCHED_SUCCESSFULLY, data: result });
});

const getFeedbackByTargetEmployee = catchAsync(async (req: Request, res: Response) => {
  const { targetEmployeeId } = req.params;
  const result = await feedbackServices.getFeedbackByTargetEmployee(targetEmployeeId as string);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.FEEDBACK_FETCHED_SUCCESSFULLY, data: result });
});

const getFeedbackByReviewer = catchAsync(async (req: Request, res: Response) => {
  const { reviewerId } = req.params;
  const result = await feedbackServices.getFeedbackByReviewer(reviewerId as string);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.FEEDBACK_FETCHED_SUCCESSFULLY, data: result });
});

const getFeedbackByCycle = catchAsync(async (req: Request, res: Response) => {
  const { cycleId } = req.params;
  const result = await feedbackServices.getFeedbackByCycle(cycleId as string);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.FEEDBACK_FETCHED_SUCCESSFULLY, data: result });
});

const updateFeedback = catchAsync(async (req: Request, res: Response) => {
  const { _id } = req.params;
  const result = await feedbackServices.updateFeedback(_id as string, req.body);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.FEEDBACK_UPDATED_SUCCESSFULLY, data: result });
});

const deleteFeedback = catchAsync(async (req: Request, res: Response) => {
  const { _id } = req.params;
  await feedbackServices.deleteFeedback(_id as string);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.FEEDBACK_DELETED_SUCCESSFULLY, data: null });
});

export default {
  addFeedback,
  getFeedbackById,
  getFeedbackByTargetEmployee,
  getFeedbackByReviewer,
  getFeedbackByCycle,
  updateFeedback,
  deleteFeedback,
};
