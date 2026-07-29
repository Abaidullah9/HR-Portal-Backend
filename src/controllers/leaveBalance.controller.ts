import { Request, Response } from "express";
import catchAsync from "../utils/helper/catchAsync";
import leaveBalanceServices from "../services/leaveBalance.services";
import { MESSAGES } from "../utils/helper/constants/messages";
import { StatusCode } from "../utils/helper/constants/enum";

const addLeaveBalance = catchAsync(async (req: Request, res: Response) => {
  const result = await leaveBalanceServices.addLeaveBalance(req.body);
  res.status(StatusCode.CREATED).json({ success: true, message: MESSAGES.LEAVE_BALANCE_ADDED_SUCCESSFULLY, data: result });
});

const getLeaveBalanceById = catchAsync(async (req: Request, res: Response) => {
  const { _id } = req.params;
  const result = await leaveBalanceServices.getLeaveBalanceById(_id as string);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.LEAVE_BALANCE_FETCHED_SUCCESSFULLY, data: result });
});

const getLeaveBalancesByEmployee = catchAsync(async (req: Request, res: Response) => {
  const { employeeId } = req.params;
  const result = await leaveBalanceServices.getLeaveBalancesByEmployee(employeeId as string);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.LEAVE_BALANCE_FETCHED_SUCCESSFULLY, data: result });
});

const getLeaveBalanceByEmployeeAndType = catchAsync(async (req: Request, res: Response) => {
  const { employeeId, leaveType, year } = req.params;
  const result = await leaveBalanceServices.getLeaveBalanceByEmployeeAndType(
    employeeId as string,
    leaveType as string,
    parseInt(year as string)
  );
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.LEAVE_BALANCE_FETCHED_SUCCESSFULLY, data: result });
});

const getAllLeaveBalanceByYear = catchAsync(async (req: Request, res: Response) => {
  const { year } = req.params;
  const result = await leaveBalanceServices.getAllLeaveBalanceByYear(parseInt(year as string));
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.LEAVE_BALANCE_FETCHED_SUCCESSFULLY, data: result });
});

const deductLeaveBalance = catchAsync(async (req: Request, res: Response) => {
  const { employeeId, leaveType, year, days } = req.body;
  const result = await leaveBalanceServices.deductLeaveBalance(employeeId, leaveType, year, days);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.LEAVE_BALANCE_UPDATED_SUCCESSFULLY, data: result });
});

const updateLeaveBalance = catchAsync(async (req: Request, res: Response) => {
  const { _id } = req.params;
  const result = await leaveBalanceServices.updateLeaveBalance(_id as string, req.body);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.LEAVE_BALANCE_UPDATED_SUCCESSFULLY, data: result });
});

const deleteLeaveBalance = catchAsync(async (req: Request, res: Response) => {
  const { _id } = req.params;
  await leaveBalanceServices.deleteLeaveBalance(_id as string);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.LEAVE_BALANCE_DELETED_SUCCESSFULLY, data: null });
});

export default {
  addLeaveBalance,
  getLeaveBalanceById,
  getLeaveBalancesByEmployee,
  getLeaveBalanceByEmployeeAndType,
  getAllLeaveBalanceByYear,
  deductLeaveBalance,
  updateLeaveBalance,
  deleteLeaveBalance,
};
