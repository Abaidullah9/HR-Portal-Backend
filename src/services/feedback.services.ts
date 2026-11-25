import { StatusCode } from "../utils/helper/constants/enum";
import { AppError } from "../utils/helper/AppError";
import feedbackModel from "../models/feedback.model";
import { CreateFeedbackDTO } from "../utils/dtos/feedback.dto";
import { MESSAGES } from "../utils/helper/constants/messages";
import { getPagination, paginatedResult, PaginationQuery } from "../utils/common";
import { canAccessEmployee, type ReadScope } from "../utils/helper/ownership";

const POPULATE = [
  { path: "targetEmployeeId", select: "name email employeeCode" },
  { path: "reviewerId", select: "name email employeeCode" },
  { path: "cycleId", select: "name status" },
];

const reachableEmployeeIds = (scope: ReadScope): string[] =>
  [scope.ownEmployeeId, ...(scope.managedEmployeeIds ?? [])].filter(
    (id): id is string => Boolean(id),
  );

/**
 * Feedback is visible to the person it is about and to the person who wrote it —
 * nothing else without a company-wide grant. A peer review is personal data, so
 * the readable set is narrower than "anyone with read_Feedback".
 */
const readableFilter = (scope: ReadScope): Record<string, unknown> => {
  if (scope.canReadAll) return {};
  const reachable = reachableEmployeeIds(scope);
  return {
    $or: [
      { targetEmployeeId: { $in: reachable } },
      { reviewerId: { $in: reachable } },
    ],
  };
};

const canReadFeedback = (
  scope: ReadScope,
  feedback: { targetEmployeeId: unknown; reviewerId: unknown },
): boolean =>
  canAccessEmployee(scope, String(feedback.targetEmployeeId)) ||
  canAccessEmployee(scope, String(feedback.reviewerId));

const addFeedback = async (feedbackData: CreateFeedbackDTO, scope: ReadScope) => {
  if (!feedbackData) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);
  if (!canAccessEmployee(scope, String(feedbackData.reviewerId))) {
    throw new AppError("Feedback is written as yourself", StatusCode.FORBIDDEN);
  }

  return feedbackModel.create(feedbackData);
};

const getAllFeedback = async (query: PaginationQuery, scope: ReadScope) => {
  const { page, limit, skip } = getPagination(query);
  const filter = readableFilter(scope);
  const allFeedback = await feedbackModel
    .find(filter)
    .populate(POPULATE)
    .skip(skip)
    .limit(limit);
  const total = await feedbackModel.countDocuments(filter);
  return paginatedResult(allFeedback, total, page, limit);
};

const getFeedbackById = async (_id: string, scope: ReadScope) => {
  if (!_id) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const feedbackById = await feedbackModel.findById(_id).populate(POPULATE);
  if (!feedbackById) throw new AppError(MESSAGES.FEEDBACK_NOT_FOUND, StatusCode.NOT_FOUND);
  if (!canReadFeedback(scope, feedbackById)) {
    throw new AppError(MESSAGES.NOT_AUTHORIZED, StatusCode.FORBIDDEN);
  }
  return feedbackById;
};

const getFeedbackByTargetEmployee = async (targetEmployeeId: string, scope: ReadScope) => {
  if (!targetEmployeeId) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);
  if (!canAccessEmployee(scope, targetEmployeeId)) {
    throw new AppError(MESSAGES.NOT_AUTHORIZED, StatusCode.FORBIDDEN);
  }

  return feedbackModel.find({ targetEmployeeId }).populate(POPULATE);
};

const getFeedbackByReviewer = async (reviewerId: string, scope: ReadScope) => {
  if (!reviewerId) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);
  if (!canAccessEmployee(scope, reviewerId)) {
    throw new AppError(MESSAGES.NOT_AUTHORIZED, StatusCode.FORBIDDEN);
  }

  return feedbackModel.find({ reviewerId }).populate(POPULATE);
};

const getFeedbackByCycle = async (cycleId: string, scope: ReadScope) => {
  if (!cycleId) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  return feedbackModel
    .find({ ...readableFilter(scope), cycleId })
    .populate(POPULATE);
};

/** The reviewer owns their words; HR/Admin may correct any record. */
const authoriseWrite = async (_id: string, scope: ReadScope) => {
  if (!_id) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const existing = await feedbackModel.findById(_id);
  if (!existing) throw new AppError(MESSAGES.FEEDBACK_NOT_FOUND, StatusCode.NOT_FOUND);
  if (!scope.canReadAll && !canAccessEmployee(scope, String(existing.reviewerId))) {
    throw new AppError(MESSAGES.NOT_AUTHORIZED, StatusCode.FORBIDDEN);
  }
  return existing;
};

const updateFeedback = async (
  _id: string,
  updateData: Partial<CreateFeedbackDTO>,
  scope: ReadScope,
) => {
  await authoriseWrite(_id, scope);

  const updatedFeedback = await feedbackModel
    .findByIdAndUpdate(_id, updateData, { returnDocument: "after" })
    .populate(POPULATE);
  if (!updatedFeedback) throw new AppError(MESSAGES.FEEDBACK_NOT_FOUND, StatusCode.NOT_FOUND);

  return updatedFeedback;
};

const deleteFeedback = async (_id: string, scope: ReadScope) => {
  await authoriseWrite(_id, scope);

  return feedbackModel.findByIdAndDelete(_id);
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
