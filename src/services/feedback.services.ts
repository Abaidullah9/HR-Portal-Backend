import { StatusCode } from "../utils/helper/constants/enum";
import { AppError } from "../utils/helper/AppError";
import feedbackModel from "../models/feedback.model";
import { CreateFeedbackDTO } from "../utils/dtos/feedback.dto";
import { MESSAGES } from "../utils/helper/constants/messages";
import { getPagination, paginatedResult, PaginationQuery } from "../utils/common";

const addFeedback = async (feedbackData: CreateFeedbackDTO) => {
  if (!feedbackData) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const newFeedback = await feedbackModel.create(feedbackData);
  return newFeedback;
};

const getAllFeedback = async (query: PaginationQuery) => {
  const { page, limit, skip } = getPagination(query);
  const allFeedback = await feedbackModel.find().populate("targetEmployeeId", "name email employeeCode").populate("reviewerId", "name email employeeCode").populate("cycleId", "name status").skip(skip).limit(limit);
  const total = await feedbackModel.countDocuments();
  return paginatedResult(allFeedback, total, page, limit);
};

const getFeedbackById = async (_id: string) => {
  if (!_id) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const feedbackById = await feedbackModel.findById(_id).populate("targetEmployeeId", "name email employeeCode").populate("reviewerId", "name email employeeCode").populate("cycleId", "name status");
  if (!feedbackById) throw new AppError(MESSAGES.FEEDBACK_NOT_FOUND, StatusCode.NOT_FOUND);
  return feedbackById;
};

const getFeedbackByTargetEmployee = async (targetEmployeeId: string) => {
  if (!targetEmployeeId) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const feedback = await feedbackModel.find({ targetEmployeeId }).populate("targetEmployeeId", "name email employeeCode").populate("reviewerId", "name email employeeCode").populate("cycleId", "name status");
  if (!feedback) throw new AppError(MESSAGES.FEEDBACK_NOT_FOUND, StatusCode.NOT_FOUND);
  return feedback;
};

const getFeedbackByReviewer = async (reviewerId: string) => {
  if (!reviewerId) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const feedback = await feedbackModel.find({ reviewerId }).populate("targetEmployeeId", "name email employeeCode").populate("reviewerId", "name email employeeCode").populate("cycleId", "name status");
  if (!feedback) throw new AppError(MESSAGES.FEEDBACK_NOT_FOUND, StatusCode.NOT_FOUND);
  return feedback;
};

const getFeedbackByCycle = async (cycleId: string) => {
  if (!cycleId) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const feedback = await feedbackModel.find({ cycleId }).populate("targetEmployeeId", "name email employeeCode").populate("reviewerId", "name email employeeCode").populate("cycleId", "name status");
  if (!feedback) throw new AppError(MESSAGES.FEEDBACK_NOT_FOUND, StatusCode.NOT_FOUND);
  return feedback;
};

const updateFeedback = async (_id: string, updateData: Partial<CreateFeedbackDTO>) => {
  if (!_id) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const updatedFeedback = await feedbackModel.findByIdAndUpdate(_id, updateData, { returnDocument: 'after' }).populate("targetEmployeeId", "name email employeeCode").populate("reviewerId", "name email employeeCode").populate("cycleId", "name status");
  if (!updatedFeedback) throw new AppError(MESSAGES.FEEDBACK_NOT_FOUND, StatusCode.NOT_FOUND);

  return updatedFeedback;
};

const deleteFeedback = async (_id: string) => {
  if (!_id) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const deletedFeedback = await feedbackModel.findByIdAndDelete(_id);

  return deletedFeedback;
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
