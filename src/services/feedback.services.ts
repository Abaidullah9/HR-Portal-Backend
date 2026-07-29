import Feedback from "../models/feedback.model";
import { AppError } from "../utils/helper/AppError";
import { CreateFeedbackDTO, UpdateFeedbackDTO } from "../utils/dtos/feedback.dto";

const addFeedback = async (feedbackData: CreateFeedbackDTO) => {
  if (!feedbackData.targetEmployeeId || !feedbackData.reviewerId || !feedbackData.relationship || !feedbackData.comment) {
    throw new AppError("Missing required fields: targetEmployeeId, reviewerId, relationship, comment", 400);
  }

  const feedback = await Feedback.create(feedbackData);
  return feedback;
};

const getFeedbackByTargetEmployee = async (employeeId: string) => {
  const feedbacks = await Feedback.find({ targetEmployeeId: employeeId })
    .populate("reviewerId", "name email")
    .populate("cycleId", "name")
    .sort({ date: -1 });
  return feedbacks;
};

const getFeedbackByReviewer = async (reviewerId: string) => {
  const feedbacks = await Feedback.find({ reviewerId })
    .populate("targetEmployeeId", "name email")
    .populate("cycleId", "name")
    .sort({ date: -1 });
  return feedbacks;
};

const getFeedbackByCycle = async (cycleId: string) => {
  const feedbacks = await Feedback.find({ cycleId })
    .populate("targetEmployeeId", "name email")
    .populate("reviewerId", "name email");
  return feedbacks;
};

const getFeedbackById = async (feedbackId: string) => {
  const feedback = await Feedback.findById(feedbackId)
    .populate("targetEmployeeId", "name email")
    .populate("reviewerId", "name email")
    .populate("cycleId", "name");
  if (!feedback) {
    throw new AppError("Feedback not found", 404);
  }
  return feedback;
};

const updateFeedback = async (feedbackId: string, updateData: UpdateFeedbackDTO) => {
  const feedback = await Feedback.findByIdAndUpdate(feedbackId, updateData, { new: true, runValidators: true })
    .populate("targetEmployeeId", "name email")
    .populate("reviewerId", "name email");
  if (!feedback) {
    throw new AppError("Feedback not found", 404);
  }
  return feedback;
};

const deleteFeedback = async (feedbackId: string) => {
  const feedback = await Feedback.findByIdAndDelete(feedbackId);
  if (!feedback) {
    throw new AppError("Feedback not found", 404);
  }
  return feedback;
};

export default {
  addFeedback,
  getFeedbackByTargetEmployee,
  getFeedbackByReviewer,
  getFeedbackByCycle,
  getFeedbackById,
  updateFeedback,
  deleteFeedback,
};
