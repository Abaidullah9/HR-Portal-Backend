import { Request, Response } from "express";
import { sendErrorResponse } from "../utils/helper/sendError";
import leaveRequestServices from "../services/leaveRequest.services";
import { MESSAGES } from "../utils/helper/constants/messages";
import { StatusCode } from "../utils/helper/constants/enum";
import { AppError } from "../utils/helper/AppError";
import { CreateLeaveRequestDTO, UpdateLeaveRequestDTO, ApproveRejectLeaveDTO } from "../utils/dtos/leaveRequest.dto";
import { PaginationQuery } from "../utils/common";
import { resolveReadScope } from "../utils/helper/ownership";
import { diffFields, recordAudit } from "../utils/helper/audit";

const addLeaveRequest = async (req: Request, res: Response) => {
  try {
    const body: CreateLeaveRequestDTO = req.body;
    const scope = await resolveReadScope(req.userId!);
    const newRequest = await leaveRequestServices.addLeaveRequest(body, scope);
    if (!newRequest) throw new AppError(MESSAGES.FAILED_TO_CREATE_LEAVE_REQUEST, StatusCode.INTERNAL_SERVER_ERROR);
    res.status(StatusCode.CREATED).json({ success: true, message: MESSAGES.LEAVE_REQUEST_ADDED_SUCCESSFULLY, data: newRequest });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const getAllLeaveRequest = async (req: Request, res: Response) => {
  try {
    const scope = await resolveReadScope(req.userId!);
    const { data, pagination } = await leaveRequestServices.getAllLeaveRequest(
      req.query as PaginationQuery & { status?: string },
      scope,
    );
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.ALL_LEAVE_REQUESTS_FETCHED_SUCCESSFULLY, data, pagination });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const getLeaveRequestById = async (req: Request, res: Response) => {
  try {
    const { _id } = req.params;
    const scope = await resolveReadScope(req.userId!);
    const result = await leaveRequestServices.getLeaveRequestById(_id as string, scope);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.LEAVE_REQUEST_FETCHED_SUCCESSFULLY, data: result });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const getLeaveRequestsByEmployee = async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const scope = await resolveReadScope(req.userId!);
    const result = await leaveRequestServices.getLeaveRequestsByEmployee(employeeId as string, scope);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.LEAVE_REQUEST_FETCHED_SUCCESSFULLY, data: result });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const getLeaveRequestsByStatus = async (req: Request, res: Response) => {
  try {
    const { status } = req.params;
    const scope = await resolveReadScope(req.userId!);
    const result = await leaveRequestServices.getLeaveRequestsByStatus(status as string, scope);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.LEAVE_REQUEST_FETCHED_SUCCESSFULLY, data: result });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const getLeaveRequestsByDateRange = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate }: { startDate?: string; endDate?: string } = req.query;
  
    if (!startDate || !endDate) {
      throw new AppError(MESSAGES.DATE_RANGE_REQUIRED, StatusCode.BAD_REQUEST);
    }
  
    const parsedStart = new Date(startDate);
    const parsedEnd = new Date(endDate);    if (isNaN(parsedStart.getTime()) || isNaN(parsedEnd.getTime())) {
      throw new AppError(MESSAGES.INVALID_DATE_FORMAT, StatusCode.BAD_REQUEST);
    }

    const scope = await resolveReadScope(req.userId!);
    const result = await leaveRequestServices.getLeaveRequestsByDateRange(
      parsedStart,
      parsedEnd,
      scope
    );
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.LEAVE_REQUEST_FETCHED_SUCCESSFULLY, data: result });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const updateLeaveRequest = async (req: Request, res: Response) => {
  try {
    const { _id } = req.params;
    const updateData: UpdateLeaveRequestDTO = req.body;
    const scope = await resolveReadScope(req.userId!);
    const result = await leaveRequestServices.updateLeaveRequest(_id as string, updateData, scope);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.LEAVE_REQUEST_UPDATED_SUCCESSFULLY, data: result });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const approveRejectLeave = async (req: Request, res: Response) => {
  try {
    const { _id } = req.params;
    // approvedById always comes from the authenticated user, never the client body
    const approvalData: ApproveRejectLeaveDTO = { ...req.body, approvedById: req.userId! };
    const scope = await resolveReadScope(req.userId!);
    const before = await leaveRequestServices.getLeaveRequestById(_id as string, scope);
    const result = await leaveRequestServices.approveRejectLeave(_id as string, approvalData, scope);
    const fields = ['leaveStatus', 'approvedById', 'rejectionReason', 'workingDays'];
    await recordAudit(req.userId, {
      action: `leave.${approvalData.leaveStatus}`,
      entity: 'LeaveRequest',
      entityId: _id as string,
      ...(approvalData.rejectionReason ? { detail: `reason: ${approvalData.rejectionReason}` } : {}),
      changes: diffFields(
        {
          leaveStatus: before?.leaveStatus,
          approvedById: before?.approvedById?.toString(),
          rejectionReason: before?.rejectionReason,
          workingDays: before?.workingDays,
        },
        {
          leaveStatus: result?.leaveStatus,
          approvedById: result?.approvedById?.toString(),
          rejectionReason: result?.rejectionReason,
          workingDays: result?.workingDays,
        },
        fields,
      ),
    }, res);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.LEAVE_REQUEST_UPDATED_SUCCESSFULLY, data: result });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const cancelLeaveRequest = async (req: Request, res: Response) => {
  try {
    const { _id } = req.params;
    const scope = await resolveReadScope(req.userId!);
    const result = await leaveRequestServices.cancelLeaveRequest(_id as string, scope);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.LEAVE_REQUEST_CANCELLED_SUCCESSFULLY, data: result });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const deleteLeaveRequest = async (req: Request, res: Response) => {
  try {
    const { _id } = req.params;
    const scope = await resolveReadScope(req.userId!);
    const deletedLeaveRequest = await leaveRequestServices.deleteLeaveRequest(_id as string, scope);
    if (!deletedLeaveRequest) throw new AppError(MESSAGES.LEAVE_REQUEST_NOT_FOUND, StatusCode.NOT_FOUND);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.LEAVE_REQUEST_DELETED_SUCCESSFULLY, data: deletedLeaveRequest });
  } catch (error) {
    sendErrorResponse(res, error);
  }
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
