import { Request, Response } from "express";
import { sendErrorResponse } from "../utils/helper/sendError";
import attendanceServices from "../services/attendance.services";
import { MESSAGES } from "../utils/helper/constants/messages";
import { StatusCode } from "../utils/helper/constants/enum";
import { AppError } from "../utils/helper/AppError";
import { CreateAttendanceDTO, UpdateAttendanceDTO } from "../utils/dtos/attendance.dto";
import { PaginationQuery } from "../utils/common";
import { canAccessEmployee, resolveReadScope } from "../utils/helper/ownership";

const addAttendance = async (req: Request, res: Response) => {
  try {
    const body: CreateAttendanceDTO = req.body;
    // Holding create_Attendance made the employeeId in the body trusted, so any
    // employee could clock a colleague in or out. The caller may only create
    // records for themselves, their reports, or (HR/Admin) anyone.
    const scope = await resolveReadScope(req.userId!);
    if (!body?.employeeId || !canAccessEmployee(scope, String(body.employeeId))) {
      throw new AppError(MESSAGES.NOT_AUTHORIZED, StatusCode.FORBIDDEN);
    }
    const newAttendance = await attendanceServices.addAttendance(body);
    if (!newAttendance) throw new AppError(MESSAGES.FAILED_TO_CREATE_ATTENDANCE, StatusCode.INTERNAL_SERVER_ERROR);
    res.status(StatusCode.CREATED).json({ success: true, message: MESSAGES.ATTENDANCE_ADDED_SUCCESSFULLY, data: newAttendance });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const getAllAttendance = async (req: Request, res: Response) => {
  try {
    const scope = await resolveReadScope(req.userId!);
    const { data, pagination } = await attendanceServices.getAllAttendance(
      req.query as PaginationQuery & { date?: string },
      scope,
    );
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.ALL_ATTENDANCE_FETCHED_SUCCESSFULLY, data, pagination });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const getAttendanceById = async (req: Request, res: Response) => {
  try {
    const { _id } = req.params;
    const scope = await resolveReadScope(req.userId!);
    const result = await attendanceServices.getAttendanceById(_id as string, scope);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.ATTENDANCE_FETCHED_SUCCESSFULLY, data: result });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const getAttendanceByEmployee = async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const scope = await resolveReadScope(req.userId!);
    const result = await attendanceServices.getAttendanceByEmployee(employeeId as string, scope);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.ATTENDANCE_FETCHED_SUCCESSFULLY, data: result });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const getAttendanceByDate = async (req: Request, res: Response) => {
  try {
    const { date } = req.params;
    const scope = await resolveReadScope(req.userId!);
    const result = await attendanceServices.getAttendanceByDate(new Date(date as string), scope);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.ATTENDANCE_FETCHED_SUCCESSFULLY, data: result });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const getAttendanceByDateRange = async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const { startDate, endDate }: { startDate?: string; endDate?: string } = req.query;
  
    if (!employeeId) {
      throw new AppError(MESSAGES.EMPLOYEE_ID_REQUIRED, StatusCode.BAD_REQUEST);
    }
    if (!startDate || !endDate) {
      throw new AppError(MESSAGES.DATE_RANGE_REQUIRED, StatusCode.BAD_REQUEST);
    }
  
    const parsedStart = new Date(startDate);
    const parsedEnd = new Date(endDate);
  
    if (isNaN(parsedStart.getTime()) || isNaN(parsedEnd.getTime())) {
      throw new AppError(MESSAGES.INVALID_DATE_FORMAT, StatusCode.BAD_REQUEST);
    }
  
    const scope = await resolveReadScope(req.userId!);
    const result = await attendanceServices.getAttendanceByDateRange(
      employeeId as string,
      parsedStart,
      parsedEnd,
      scope
    );
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.ATTENDANCE_FETCHED_SUCCESSFULLY, data: result });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const updateAttendance = async (req: Request, res: Response) => {
  try {
    const { _id } = req.params;
    const updateData: UpdateAttendanceDTO = req.body;
    const scope = await resolveReadScope(req.userId!);
    const result = await attendanceServices.updateAttendance(_id as string, updateData, scope);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.ATTENDANCE_UPDATED_SUCCESSFULLY, data: result });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const deleteAttendance = async (req: Request, res: Response) => {
  try {
    const { _id } = req.params;
    const scope = await resolveReadScope(req.userId!);
    const deletedAttendance = await attendanceServices.deleteAttendance(_id as string, scope);
    if (!deletedAttendance) throw new AppError(MESSAGES.ATTENDANCE_NOT_FOUND, StatusCode.NOT_FOUND);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.ATTENDANCE_DELETED_SUCCESSFULLY, data: deletedAttendance });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

export default {
  addAttendance,
  getAllAttendance,
  getAttendanceById,
  getAttendanceByEmployee,
  getAttendanceByDate,
  getAttendanceByDateRange,
  updateAttendance,
  deleteAttendance,
};
