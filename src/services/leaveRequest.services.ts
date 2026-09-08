import { StatusCode } from "../utils/helper/constants/enum";
import { AppError } from "../utils/helper/AppError";
import leaveRequestModel from "../models/leaveRequest.model";
import { CreateLeaveRequestDTO } from "../utils/dtos/leaveRequest.dto";
import { MESSAGES } from "../utils/helper/constants/messages";
import mongoose from "mongoose";
import leaveBalanceServices from "./leaveBalance.services";
import { getPagination, paginatedResult, PaginationQuery } from "../utils/common";
import { ReadScope } from "../utils/helper/ownership";

const addLeaveRequest = async (requestData: CreateLeaveRequestDTO) => {
  if (!requestData) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const newRequest = await leaveRequestModel.create(requestData);
  return newRequest;
};
const getAllLeaveRequest = async (query: PaginationQuery, scope: ReadScope) => {
  const { page, limit, skip } = getPagination(query);
  const filter: Record<string, unknown> = {};
  if (!scope.canReadAll) filter.employeeId = scope.ownEmployeeId ?? null;
  const allRequests = await leaveRequestModel.find(filter).populate("employeeId", "name email employeeCode").populate("approvedById", "name email employeeCode").skip(skip).limit(limit);
  const total = await leaveRequestModel.countDocuments(filter);
  return paginatedResult(allRequests, total, page, limit);
};
const getLeaveRequestById = async (_id: string, scope: ReadScope) => {
  if (!_id) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const requestById = await leaveRequestModel.findById(_id);
  if (!requestById) throw new AppError(MESSAGES.LEAVE_REQUEST_NOT_FOUND, StatusCode.NOT_FOUND);
  if (!scope.canReadAll && requestById.employeeId.toString() !== scope.ownEmployeeId) {
    throw new AppError(MESSAGES.NOT_AUTHORIZED, StatusCode.FORBIDDEN);
  }
  await requestById.populate("employeeId", "name email employeeCode");
  await requestById.populate("approvedById", "name email employeeCode");
  return requestById;
};

const getLeaveRequestsByEmployee = async (employeeId: string, scope: ReadScope) => {
  if (!employeeId) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);
  if (!scope.canReadAll && employeeId !== scope.ownEmployeeId) {
    throw new AppError(MESSAGES.NOT_AUTHORIZED, StatusCode.FORBIDDEN);
  }

  const requests = await leaveRequestModel.find({ employeeId }).populate("employeeId", "name email employeeCode").populate("approvedById", "name email employeeCode");
  if (!requests) throw new AppError(MESSAGES.LEAVE_REQUEST_NOT_FOUND, StatusCode.NOT_FOUND);
  return requests;
};

const getLeaveRequestsByStatus = async (status: string, scope: ReadScope) => {
  if (!status) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const filter: Record<string, unknown> = { leaveStatus: status };
  if (!scope.canReadAll) filter.employeeId = scope.ownEmployeeId ?? null;
  const requests = await leaveRequestModel.find(filter).populate("employeeId", "name email employeeCode").populate("approvedById", "name email employeeCode");
  if (!requests) throw new AppError(MESSAGES.LEAVE_REQUEST_NOT_FOUND, StatusCode.NOT_FOUND);
  return requests;
};

const getLeaveRequestsByDateRange = async (startDate: Date, endDate: Date, scope: ReadScope) => {
  if (!startDate || !endDate) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const filter: Record<string, unknown> = {
    fromDate: { $gte: startDate },
    toDate: { $lte: endDate },
  };
  if (!scope.canReadAll) filter.employeeId = scope.ownEmployeeId ?? null;
  const requests = await leaveRequestModel.find(filter).populate("employeeId", "name email employeeCode").populate("approvedById", "name email employeeCode");
  if (!requests) throw new AppError(MESSAGES.LEAVE_REQUEST_NOT_FOUND, StatusCode.NOT_FOUND);
  return requests;
};

const updateLeaveRequest = async (_id: string, updateData: Partial<CreateLeaveRequestDTO>, scope: ReadScope) => {
  if (!_id) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const existingRequest = await leaveRequestModel.findById(_id);
  if (!existingRequest) throw new AppError(MESSAGES.LEAVE_REQUEST_NOT_FOUND, StatusCode.NOT_FOUND);
  if (!scope.canReadAll && existingRequest.employeeId.toString() !== scope.ownEmployeeId) {
    throw new AppError(MESSAGES.NOT_AUTHORIZED, StatusCode.FORBIDDEN);
  }

  const updatedRequest = await leaveRequestModel.findByIdAndUpdate(_id, updateData, { returnDocument: 'after' }).populate("employeeId", "name email employeeCode").populate("approvedById", "name email employeeCode");
  if (!updatedRequest) throw new AppError(MESSAGES.LEAVE_REQUEST_NOT_FOUND, StatusCode.NOT_FOUND);

  return updatedRequest;
};

const approveRejectLeave = async (requestId: string, approvalData: { leaveStatus: 'approved' | 'rejected'; approvedById: string; rejectionReason?: string }) => {
  if (!requestId || !approvalData) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const request = await leaveRequestModel.findById(requestId);
  if (!request) throw new AppError(MESSAGES.LEAVE_REQUEST_NOT_FOUND, StatusCode.NOT_FOUND);
  if (request.leaveStatus !== 'pending') throw new AppError(MESSAGES.CANNOT_UPDATE_NON_PENDING, StatusCode.BAD_REQUEST);

  const applyDecision = async (session?: mongoose.ClientSession) => {
    request.leaveStatus = approvalData.leaveStatus;
    request.approvedById = new mongoose.Types.ObjectId(approvalData.approvedById);
    if (approvalData.rejectionReason) {
      request.rejectionReason = approvalData.rejectionReason;
    }
    await request.save(session ? { session } : {});

    if (approvalData.leaveStatus === 'approved') {
      const fromDate = new Date(request.fromDate);
      const toDate = new Date(request.toDate);
      const daysDiff = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const year = fromDate.getFullYear();

      await leaveBalanceServices.deductLeaveBalance(
        request.employeeId.toString(),
        request.leaveType,
        year,
        daysDiff,
        session
      );
    }
  };

  const session = await mongoose.startSession();
  let transactionStarted = false;
  try {
    session.startTransaction();
    transactionStarted = true;
    await applyDecision(session);
    await session.commitTransaction();
  } catch (error: any) {
    await session.abortTransaction().catch(() => {});

    // Standalone MongoDB (local dev) doesn't support multi-document transactions.
    // Fall back to plain sequential writes instead of failing with a 500.
    const txUnsupported = /retryable writes|Transaction numbers/i.test(error?.message || '') || error?.code === 20;
    if (!transactionStarted || !txUnsupported) {
      throw error;
    }
    request.$session(null);
    await applyDecision();
  } finally {
    session.endSession();
  }

  return request;
};

const cancelLeaveRequest = async (_id: string, scope: ReadScope) => {
  if (!_id) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const request = await leaveRequestModel.findById(_id);
  if (!request) throw new AppError(MESSAGES.LEAVE_REQUEST_NOT_FOUND, StatusCode.NOT_FOUND);
  if (!scope.canReadAll && request.employeeId.toString() !== scope.ownEmployeeId) {
    throw new AppError(MESSAGES.NOT_AUTHORIZED, StatusCode.FORBIDDEN);
  }
  if (request.leaveStatus !== 'pending') throw new AppError(MESSAGES.CANNOT_CANCEL_NON_PENDING, StatusCode.BAD_REQUEST);

  request.leaveStatus = 'cancelled';
  await request.save();
  return request;
};

const deleteLeaveRequest = async (_id: string, scope: ReadScope) => {
  if (!_id) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const existingRequest = await leaveRequestModel.findById(_id);
  if (!existingRequest) throw new AppError(MESSAGES.LEAVE_REQUEST_NOT_FOUND, StatusCode.NOT_FOUND);
  if (!scope.canReadAll && existingRequest.employeeId.toString() !== scope.ownEmployeeId) {
    throw new AppError(MESSAGES.NOT_AUTHORIZED, StatusCode.FORBIDDEN);
  }

  const deletedRequest = await leaveRequestModel.findByIdAndDelete(_id);

  return deletedRequest;
};

export default {
  addLeaveRequest,
  getAllLeaveRequest,
  getLeaveRequestById,
  getLeaveRequestsByEmployee,
  getLeaveRequestsByStatus,
  getLeaveRequestsByDateRange,
  updateLeaveRequest,
  approveRejectLeave,
  cancelLeaveRequest,
  deleteLeaveRequest,
};
