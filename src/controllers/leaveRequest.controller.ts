import { Request, Response } from "express";
import catchAsync from "../utils/helper/catchAsync";
import leaveRequestServices from "../services/leaveRequest.services";
import { MESSAGES } from "../utils/helper/constants/messages";
import { StatusCode } from "../utils/helper/constants/enum";

const addLeaveRequest = catchAsync(async (req: Request, res: Response) => {
  const result = await leaveRequestServices.addLeaveRequest(req.body);
  res.status(StatusCode.CREATED).json({ success: true, message: MESSAGES.LEAVE_REQUEST_ADDED_SUCCESSFULLY, data: result });
});

const getLeaveRequestById = catchAsync(async (req: Request, res: Response) => {
  const { _id } = req.params;
  const result = await leaveRequestServices.getLeaveRequestById(_id as string);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.LEAVE_REQUEST_FETCHED_SUCCESSFULLY, data: result });
});

const getLeaveRequestsByEmployee = catchAsync(async (req: Request, res: Response) => {
  const { employeeId } = req.params;
  const result = await leaveRequestServices.getLeaveRequestsByEmployee(employeeId as string);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.LEAVE_REQUEST_FETCHED_SUCCESSFULLY, data: result });
});

const getLeaveRequestsByStatus = catchAsync(async (req: Request, res: Response) => {
  const { status } = req.params;
  const result = await leaveRequestServices.getLeaveRequestsByStatus(status as string);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.LEAVE_REQUEST_FETCHED_SUCCESSFULLY, data: result });
});

const getLeaveRequestsByDateRange = catchAsync(async (req: Request, res: Response) => {
  const { startDate, endDate } = req.query;
  const result = await leaveRequestServices.getLeaveRequestsByDateRange(
    new Date(startDate as string),
    new Date(endDate as string)
  );
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.LEAVE_REQUEST_FETCHED_SUCCESSFULLY, data: result });
});

const updateLeaveRequest = catchAsync(async (req: Request, res: Response) => {
  const { _id } = req.params;
  const result = await leaveRequestServices.updateLeaveRequest(_id as string, req.body);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.LEAVE_REQUEST_UPDATED_SUCCESSFULLY, data: result });
});

const approveRejectLeave = catchAsync(async (req: Request, res: Response) => {
  const { _id } = req.params;
  const result = await leaveRequestServices.approveRejectLeave(_id as string, req.body);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.LEAVE_REQUEST_UPDATED_SUCCESSFULLY, data: result });
});

const cancelLeaveRequest = catchAsync(async (req: Request, res: Response) => {
  const { _id } = req.params;
  const result = await leaveRequestServices.cancelLeaveRequest(_id as string);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.LEAVE_REQUEST_CANCELLED_SUCCESSFULLY, data: result });
});

const deleteLeaveRequest = catchAsync(async (req: Request, res: Response) => {
  const { _id } = req.params;
  await leaveRequestServices.deleteLeaveRequest(_id as string);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.LEAVE_REQUEST_DELETED_SUCCESSFULLY, data: null });
});

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
