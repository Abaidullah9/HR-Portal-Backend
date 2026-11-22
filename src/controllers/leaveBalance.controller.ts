import { Request, Response } from "express";
import { sendErrorResponse } from "../utils/helper/sendError";
import leaveBalanceServices from "../services/leaveBalance.services";
import { MESSAGES } from "../utils/helper/constants/messages";
import { StatusCode } from "../utils/helper/constants/enum";
import { AppError } from "../utils/helper/AppError";
import { CreateLeaveBalanceDTO, UpdateLeaveBalanceDTO } from "../utils/dtos/leaveBalance.dto";
import { PaginationQuery } from "../utils/common";

const addLeaveBalance = async (req: Request, res: Response) => {
  try {
    const body: CreateLeaveBalanceDTO = req.body;
    const newBalance = await leaveBalanceServices.addLeaveBalance(body);
    if (!newBalance) throw new AppError(MESSAGES.FAILED_TO_CREATE_LEAVE_BALANCE, StatusCode.INTERNAL_SERVER_ERROR);
    res.status(StatusCode.CREATED).json({ success: true, message: MESSAGES.LEAVE_BALANCE_ADDED_SUCCESSFULLY, data: newBalance });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const getLeaveBalanceById = async (req: Request, res: Response) => {
  try {
    const { _id } = req.params;
    const result = await leaveBalanceServices.getLeaveBalanceById(_id as string);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.LEAVE_BALANCE_FETCHED_SUCCESSFULLY, data: result });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const getLeaveBalancesByEmployee = async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const result = await leaveBalanceServices.getLeaveBalancesByEmployee(employeeId as string);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.LEAVE_BALANCE_FETCHED_SUCCESSFULLY, data: result });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const getLeaveBalanceByEmployeeAndType = async (req: Request, res: Response) => {
  try {
    const { employeeId, leaveType, year } = req.params;
    const result = await leaveBalanceServices.getLeaveBalanceByEmployeeAndType(
      employeeId as string,
      leaveType as string,
      parseInt(year as string)
    );
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.LEAVE_BALANCE_FETCHED_SUCCESSFULLY, data: result });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const getAllLeaveBalance = async (req: Request, res: Response) => {
  try {
    const { data, pagination } = await leaveBalanceServices.getAllLeaveBalance(req.query as PaginationQuery);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.ALL_LEAVE_BALANCES_FETCHED_SUCCESSFULLY, data, pagination });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const getAllLeaveBalanceByYear = async (req: Request, res: Response) => {
  try {
    const { year } = req.params;
    const { data, pagination } = await leaveBalanceServices.getAllLeaveBalanceByYear(parseInt(year as string), req.query as PaginationQuery);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.LEAVE_BALANCE_FETCHED_SUCCESSFULLY, data, pagination });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const deductLeaveBalance = async (req: Request, res: Response) => {
  try {
    const { employeeId, leaveType, year, days }: { employeeId: string; leaveType: string; year: number; days: number } = req.body;
    const result = await leaveBalanceServices.deductLeaveBalance(employeeId, leaveType, year, days);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.LEAVE_BALANCE_UPDATED_SUCCESSFULLY, data: result });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const updateLeaveBalance = async (req: Request, res: Response) => {
  try {
    const { _id } = req.params;
    const updateData: UpdateLeaveBalanceDTO = req.body;
    const result = await leaveBalanceServices.updateLeaveBalance(_id as string, updateData);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.LEAVE_BALANCE_UPDATED_SUCCESSFULLY, data: result });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const deleteLeaveBalance = async (req: Request, res: Response) => {
  try {
    const { _id } = req.params;
    const deletedLeaveBalance = await leaveBalanceServices.deleteLeaveBalance(_id as string);
    if (!deletedLeaveBalance) throw new AppError(MESSAGES.LEAVE_BALANCE_NOT_FOUND, StatusCode.NOT_FOUND);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.LEAVE_BALANCE_DELETED_SUCCESSFULLY, data: deletedLeaveBalance });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const accrueLeaveBalances = async (_req: Request, res: Response) => {
  try {
    const data = await leaveBalanceServices.accrueLeaveBalances();
    res.status(StatusCode.OK).json({ success: true, message: "Leave accrual posted", data });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

export default {
  addLeaveBalance,
  accrueLeaveBalances,
  getAllLeaveBalance,
  getLeaveBalanceById,
  getLeaveBalancesByEmployee,
  getLeaveBalanceByEmployeeAndType,
  getAllLeaveBalanceByYear,
  deductLeaveBalance,
  updateLeaveBalance,
  deleteLeaveBalance,
};
