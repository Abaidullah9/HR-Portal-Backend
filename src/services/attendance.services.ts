import Attendance from "../models/attendance.model";
import { AppError } from "../utils/helper/AppError";
import { CreateAttendanceDTO, UpdateAttendanceDTO } from "../utils/dtos/attendance.dto";

const addAttendance = async (attendanceData: CreateAttendanceDTO) => {
  if (!attendanceData.employeeId || !attendanceData.date) {
    throw new AppError("Missing required fields: employeeId, date", 400);
  }

  const existingRecord = await Attendance.findOne({
    employeeId: attendanceData.employeeId,
    date: attendanceData.date,
  });
  if (existingRecord) {
    throw new AppError("Attendance record already exists for this employee on this date", 409);
  }

  const attendance = await Attendance.create(attendanceData);
  return attendance;
};

const getAttendanceByEmployee = async (employeeId: string) => {
  const records = await Attendance.find({ employeeId }).sort({ date: -1 });
  return records;
};

const getAttendanceByDate = async (date: Date) => {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const records = await Attendance.find({
    date: { $gte: startOfDay, $lte: endOfDay },
  }).populate("employeeId", "name email");
  return records;
};

const getAttendanceById = async (attendanceId: string) => {
  const attendance = await Attendance.findById(attendanceId)
    .populate("employeeId", "name email");
  if (!attendance) {
    throw new AppError("Attendance record not found", 404);
  }
  return attendance;
};

const getAttendanceByDateRange = async (employeeId: string, startDate: Date, endDate: Date) => {
  const records = await Attendance.find({
    employeeId,
    date: { $gte: startDate, $lte: endDate },
  }).sort({ date: 1 });
  return records;
};

const updateAttendance = async (attendanceId: string, updateData: UpdateAttendanceDTO) => {
  const attendance = await Attendance.findByIdAndUpdate(attendanceId, updateData, { new: true, runValidators: true });
  if (!attendance) {
    throw new AppError("Attendance record not found", 404);
  }
  return attendance;
};

const deleteAttendance = async (attendanceId: string) => {
  const attendance = await Attendance.findByIdAndDelete(attendanceId);
  if (!attendance) {
    throw new AppError("Attendance record not found", 404);
  }
  return attendance;
};

export default {
  addAttendance,
  getAttendanceByEmployee,
  getAttendanceById,
  getAttendanceByDate,
  getAttendanceByDateRange,
  updateAttendance,
  deleteAttendance,
};
