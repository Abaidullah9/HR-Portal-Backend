import { StatusCode } from '../utils/helper/constants/enum';
import { AppError } from '../utils/helper/AppError';
import mongoose from 'mongoose';
import appraisalModel from '../models/appraisal.model';
import { CreateAppraisalDTO } from '../utils/dtos/appraisal.dto';
import { MESSAGES } from '../utils/helper/constants/messages';
import { getPagination, paginatedResult, PaginationQuery } from '../utils/common';
import { canAccessEmployee, scopeEmployeeFilter, type ReadScope } from '../utils/helper/ownership';
import { tenantFields, tenantFilter } from '../utils/context';

const addAppraisal = async (appraisalData: CreateAppraisalDTO) => {
  if (!appraisalData) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  return appraisalModel.create({ ...appraisalData, ...tenantFields() });
};

const getAllAppraisal = async (query: PaginationQuery, scope?: ReadScope) => {
  const { page, limit, skip } = getPagination(query);
  // Pay and performance are the two things a missing scope filter leaks worst:
  // this list used to return every employee's ratings to any reader.
  const filter: Record<string, unknown> = tenantFilter(scope ? scopeEmployeeFilter(scope) : {});

  const allAppraisals = await appraisalModel
    .find(filter)
    .populate('employeeId', 'name email')
    .populate('cycleId', 'name')
    .populate('appraiserId', 'name email')
    .sort({ reviewDate: -1 })
    .skip(skip)
    .limit(limit);
  const total = await appraisalModel.countDocuments(filter);
  return paginatedResult(allAppraisals, total, page, limit);
};

const getAppraisalById = async (_id: string, scope?: ReadScope) => {
  if (!_id) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const appraisalById = await appraisalModel
    .findById(_id)
    .populate('employeeId', 'name email')
    .populate('cycleId', 'name')
    .populate('appraiserId', 'name email');
  if (!appraisalById) throw new AppError(MESSAGES.APPRAISAL_NOT_FOUND, StatusCode.NOT_FOUND);

  if (scope && !canAccessEmployee(scope, appraisalById.employeeId.toString())) {
    throw new AppError(MESSAGES.NOT_AUTHORIZED, StatusCode.FORBIDDEN);
  }

  return appraisalById;
};

const getAppraisalsByEmployee = async (employeeId: string, scope?: ReadScope) => {
  if (!employeeId) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);
  if (scope && !canAccessEmployee(scope, employeeId)) {
    throw new AppError(MESSAGES.NOT_AUTHORIZED, StatusCode.FORBIDDEN);
  }

  // An employee holds no read_Appraisal grant, but this is their own review.
  return appraisalModel
    .find(tenantFilter({ employeeId }))
    .populate('cycleId', 'name')
    .populate('appraiserId', 'name email')
    .sort({ reviewDate: -1 });
};

const getAppraisalsByCycle = async (cycleId: string) => {
  if (!cycleId) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  return appraisalModel
    .find({ cycleId })
    .populate('employeeId', 'name email')
    .populate('appraiserId', 'name email');
};

const updateAppraisal = async (_id: string, updateData: Partial<CreateAppraisalDTO>) => {
  if (!_id) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const existing = await appraisalModel.findById(_id);
  if (!existing) throw new AppError(MESSAGES.APPRAISAL_NOT_FOUND, StatusCode.NOT_FOUND);
  if (existing.lockedAt) {
    throw new AppError('This appraisal is locked and can no longer be edited', StatusCode.CONFLICT);
  }

  const updatedAppraisal = await appraisalModel
    .findByIdAndUpdate(_id, updateData, { returnDocument: 'after' })
    .populate('employeeId', 'name email')
    .populate('cycleId', 'name')
    .populate('appraiserId', 'name email');
  if (!updatedAppraisal) throw new AppError(MESSAGES.APPRAISAL_NOT_FOUND, StatusCode.NOT_FOUND);

  return updatedAppraisal;
};

const updateAppraisalStatus = async (_id: string, status: string) => {
  if (!_id || !status) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const updatedAppraisal = await appraisalModel
    .findByIdAndUpdate(_id, { status }, { returnDocument: 'after' })
    .populate('employeeId', 'name email')
    .populate('cycleId', 'name')
    .populate('appraiserId', 'name email');
  if (!updatedAppraisal) throw new AppError(MESSAGES.APPRAISAL_NOT_FOUND, StatusCode.NOT_FOUND);

  return updatedAppraisal;
};

const deleteAppraisal = async (_id: string) => {
  if (!_id) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  return appraisalModel.findByIdAndDelete(_id);
};

/**
 * The review workflow. Each step moves the appraisal forward exactly once, so
 * a review cannot be calibrated before the manager has written it, and a locked
 * appraisal cannot be reopened by an ordinary update.
 */
const submitSelfReview = async (
  appraisalId: string,
  input: { comment: string; rating?: number },
  scope: ReadScope,
) => {
  const appraisal = await appraisalModel.findById(appraisalId);
  if (!appraisal) throw new AppError(MESSAGES.APPRAISAL_NOT_FOUND, StatusCode.NOT_FOUND);

  const isOwner = scope.ownEmployeeId === appraisal.employeeId.toString();
  if (!isOwner && !scope.canReadAll) {
    throw new AppError('Only the employee can submit their self review', StatusCode.FORBIDDEN);
  }
  if (appraisal.workflowStage !== 'self_review') {
    throw new AppError('The self review has already been submitted', StatusCode.CONFLICT);
  }
  if (!input.comment?.trim()) throw new AppError('Add a short self review before submitting', StatusCode.BAD_REQUEST);

  appraisal.selfReview = input.comment.trim();
  if (input.rating !== undefined) appraisal.selfRating = input.rating;
  appraisal.selfReviewAt = new Date();
  appraisal.workflowStage = 'manager_review';
  await appraisal.save();
  return appraisal;
};

const submitManagerReview = async (
  appraisalId: string,
  input: { comment: string; rating?: number },
  scope: ReadScope,
) => {
  const appraisal = await appraisalModel.findById(appraisalId);
  if (!appraisal) throw new AppError(MESSAGES.APPRAISAL_NOT_FOUND, StatusCode.NOT_FOUND);

  const isAppraiser = scope.ownEmployeeId === appraisal.appraiserId.toString();
  if (!isAppraiser && !scope.canReadAll) {
    throw new AppError('Only the assigned appraiser can submit the manager review', StatusCode.FORBIDDEN);
  }
  if (appraisal.workflowStage !== 'manager_review') {
    throw new AppError('The appraisal is not waiting for a manager review', StatusCode.CONFLICT);
  }
  if (!input.comment?.trim()) throw new AppError('Add the manager review before submitting', StatusCode.BAD_REQUEST);

  appraisal.managerReview = input.comment.trim();
  if (input.rating !== undefined) appraisal.overallRating = input.rating;
  appraisal.managerReviewAt = new Date();
  appraisal.workflowStage = 'calibration';
  await appraisal.save();
  return appraisal;
};

const calibrate = async (
  appraisalId: string,
  input: { note: string; rating?: number },
  scope: ReadScope,
  actorId?: string,
) => {
  const appraisal = await appraisalModel.findById(appraisalId);
  if (!appraisal) throw new AppError(MESSAGES.APPRAISAL_NOT_FOUND, StatusCode.NOT_FOUND);
  if (!scope.canReadAll) {
    throw new AppError('Only HR or an administrator can calibrate ratings', StatusCode.FORBIDDEN);
  }
  if (appraisal.workflowStage !== 'calibration') {
    throw new AppError('The appraisal is not ready for calibration', StatusCode.CONFLICT);
  }
  if (!input.note?.trim()) throw new AppError('Record the calibration decision', StatusCode.BAD_REQUEST);

  appraisal.calibrationNote = input.note.trim();
  if (input.rating !== undefined) appraisal.overallRating = input.rating;
  appraisal.calibratedAt = new Date();
  if (actorId) appraisal.calibratedBy = new mongoose.Types.ObjectId(actorId);
  appraisal.workflowStage = 'completed';
  appraisal.status = 'completed';
  await appraisal.save();
  return appraisal;
};

const lock = async (appraisalId: string, scope: ReadScope) => {
  const appraisal = await appraisalModel.findById(appraisalId);
  if (!appraisal) throw new AppError(MESSAGES.APPRAISAL_NOT_FOUND, StatusCode.NOT_FOUND);
  if (!scope.canReadAll) {
    throw new AppError('Only HR or an administrator can lock an appraisal', StatusCode.FORBIDDEN);
  }
  if (appraisal.workflowStage !== 'completed') {
    throw new AppError('Only a completed appraisal can be locked', StatusCode.CONFLICT);
  }

  appraisal.lockedAt = new Date();
  await appraisal.save();
  return appraisal;
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
  submitSelfReview,
  submitManagerReview,
  calibrate,
  lock,
};
