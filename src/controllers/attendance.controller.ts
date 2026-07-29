import { Request, Response } from "express";
import catchAsync from "../utils/helper/catchAsync";
import attendanceServices from "../services/attendance.services";
import { MESSAGES } from "../utils/helper/constants/messages";
import { StatusCode } from "../utils/helper/constants/enum";

const addAttendance = catchAsync(async (req: Request, res: Response) => {
  const result = await attendanceServices.addAttendance(req.body);
  res.status(StatusCode.CREATED).json({ success: true, message: MESSAGES.ATTENDANCE_ADDED_SUCCESSFULLY, data: result });
});

const getAttendanceById = catchAsync(async (req: Request, res: Response) => {
  const { _id } = req.params;
  const result = await attendanceServices.getAttendanceById(_id as string);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.ATTENDANCE_FETCHED_SUCCESSFULLY, data: result });
});

const getAttendanceByEmployee = catchAsync(async (req: Request, res: Response) => {
  const { employeeId } = req.params;
  const result = await attendanceServices.getAttendanceByEmployee(employeeId as string);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.ATTENDANCE_FETCHED_SUCCESSFULLY, data: result });
});

const getAttendanceByDate = catchAsync(async (req: Request, res: Response) => {
  const { date } = req.params;
  const result = await attendanceServices.getAttendanceByDate(new Date(date as string));
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.ATTENDANCE_FETCHED_SUCCESSFULLY, data: result });
});

const getAttendanceByDateRange = catchAsync(async (req: Request, res: Response) => {
  const { employeeId } = req.params;
  const { startDate, endDate } = req.query;
  const result = await attendanceServices.getAttendanceByDateRange(
    employeeId as string,
    new Date(startDate as string),
    new Date(endDate as string)
  );
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.ATTENDANCE_FETCHED_SUCCESSFULLY, data: result });
});

const updateAttendance = catchAsync(async (req: Request, res: Response) => {
  const { _id } = req.params;
  const result = await attendanceServices.updateAttendance(_id as string, req.body);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.ATTENDANCE_UPDATED_SUCCESSFULLY, data: result });
});

const deleteAttendance = catchAsync(async (req: Request, res: Response) => {
  const { _id } = req.params;
  await attendanceServices.deleteAttendance(_id as string);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.ATTENDANCE_DELETED_SUCCESSFULLY, data: null });
});

export default {
  addAttendance,
  getAttendanceById,
  getAttendanceByEmployee,
  getAttendanceByDate,
  getAttendanceByDateRange,
  updateAttendance,
  deleteAttendance,
};
