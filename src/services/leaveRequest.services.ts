import mongoose from "mongoose";
import LeaveRequest from "../models/leaveRequest.model";
import { AppError, MongoFilter } from "../utils/helper/AppError";
import { CreateLeaveRequestDTO, UpdateLeaveRequestDTO, ApproveRejectLeaveDTO } from "../utils/dtos/leaveRequest.dto";
import leaveBalanceServices from "./leaveBalance.services";
const addLeaveRequest = async (requestData: CreateLeaveRequestDTO) => {
  if (!requestData.employeeId || !requestData.leaveType || !requestData.fromDate || !requestData.toDate || !requestData.reasonForLeave) {
    throw new AppError("Missing required fields: employeeId, leaveType, fromDate, toDate, reasonForLeave", 400);
  }

  if (new Date(requestData.fromDate) > new Date(requestData.toDate)) {
    throw new AppError("From date cannot be after to date", 400);
  }

  const leaveRequest = await LeaveRequest.create(requestData);
  return leaveRequest;
};

const getLeaveRequestById = async (requestId: string) => {
  const leaveRequest = await LeaveRequest.findById(requestId)
    .populate("employeeId", "name email")
    .populate("approvedById", "name email");
  if (!leaveRequest) {
    throw new AppError("Leave request not found", 404);
  }
  return leaveRequest;
};

const getLeaveRequestsByEmployee = async (employeeId: string) => {
  const requests = await LeaveRequest.find({ employeeId })
    .populate("approvedById", "name email")
    .sort({ fromDate: -1 });
  return requests;
};

const getLeaveRequestsByStatus = async (status: string) => {
  const queryFilter: MongoFilter = { leaveStatus: status };
  const requests = await LeaveRequest.find(queryFilter)
    .populate("employeeId", "name email")
    .populate("approvedById", "name email")
    .sort({ fromDate: -1 });
  return requests;
};

const getLeaveRequestsByDateRange = async (startDate: Date, endDate: Date) => {
  const requests = await LeaveRequest.find({
    fromDate: { $gte: startDate },
    toDate: { $lte: endDate },
  })
    .populate("employeeId", "name email")
    .sort({ fromDate: 1 });
  return requests;
};

const updateLeaveRequest = async (requestId: string, updateData: UpdateLeaveRequestDTO) => {
  const request = await LeaveRequest.findById(requestId);
  if (!request) {
    throw new AppError("Leave request not found", 404);
  }

  if (request.leaveStatus !== 'pending') {
    throw new AppError("Cannot update a non-pending leave request", 400);
  }

  const updatedRequest = await LeaveRequest.findByIdAndUpdate(requestId, updateData, { new: true, runValidators: true })
    .populate("employeeId", "name email");
  return updatedRequest;
};

const approveRejectLeave = async (requestId: string, approvalData: ApproveRejectLeaveDTO) => {
  if (!approvalData.leaveStatus || !approvalData.approvedById) {
    throw new AppError("Missing required fields: leaveStatus, approvedById", 400);
  }

  if (!['approved', 'rejected'].includes(approvalData.leaveStatus)) {
    throw new AppError("Leave status must be 'approved' or 'rejected'", 400);
  }

  if (approvalData.leaveStatus === 'rejected' && !approvalData.rejectionReason) {
    throw new AppError("Rejection reason is required when rejecting a leave request", 400);
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const request = await LeaveRequest.findById(requestId).session(session);
    if (!request) {
      throw new AppError("Leave request not found", 404);
    }

    if (request.leaveStatus !== 'pending') {
      throw new AppError("Leave request has already been processed", 400);
    }

    const leaveUpdatePayload: Record<string, any> = {
      leaveStatus: approvalData.leaveStatus,
      approvedById: approvalData.approvedById,
    };

    if (approvalData.leaveStatus === 'rejected' && approvalData.rejectionReason) {
      leaveUpdatePayload.rejectionReason = approvalData.rejectionReason;
    }

    // If approved, automatically deduct leave balance (in transaction)
    if (approvalData.leaveStatus === 'approved') {
      const fromDate = new Date(request.fromDate);
      const toDate = new Date(request.toDate);
      const daysDiff = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const year = fromDate.getFullYear();

      await leaveBalanceServices.deductLeaveBalance(
        request.employeeId.toString(),
        request.leaveType,
        year,
        daysDiff
      );
    }

    const updatedRequest = await LeaveRequest.findByIdAndUpdate(requestId, leaveUpdatePayload, { new: true, session })
      .populate("employeeId", "name email")
      .populate("approvedById", "name email");

    await session.commitTransaction();
    return updatedRequest;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

const cancelLeaveRequest = async (requestId: string) => {
  const request = await LeaveRequest.findById(requestId);
  if (!request) {
    throw new AppError("Leave request not found", 404);
  }

  if (request.leaveStatus !== 'pending') {
    throw new AppError("Can only cancel pending leave requests", 400);
  }

  request.leaveStatus = 'cancelled';
  await request.save();
  return request;
};

const deleteLeaveRequest = async (requestId: string) => {
  const request = await LeaveRequest.findByIdAndDelete(requestId);
  if (!request) {
    throw new AppError("Leave request not found", 404);
  }
  return request;
};

export default {
  addLeaveRequest,
  getLeaveRequestById,
  getLeaveRequestsByEmployee,
  getLeaveRequestsByStatus,
  getLeaveRequestsByDateRange,
  updateLeaveRequest,
  approveRejectLeave,
  cancelLeaveRequest,
  deleteLeaveRequest,
};
