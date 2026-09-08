import { StatusCode } from "../utils/helper/constants/enum";
import { AppError } from "../utils/helper/AppError";
import attendanceModel from "../models/attendance.model";
import { CreateAttendanceDTO } from "../utils/dtos/attendance.dto";
import { MESSAGES } from "../utils/helper/constants/messages";
import { getPagination, paginatedResult, PaginationQuery } from "../utils/common";
import { ReadScope } from "../utils/helper/ownership";

const addAttendance = async (attendanceData: CreateAttendanceDTO) => {
  if (!attendanceData) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const newAttendance = await attendanceModel.create(attendanceData);
  return newAttendance;
};

const getAllAttendance = async (query: PaginationQuery, scope: ReadScope) => {
  const { page, limit, skip } = getPagination(query);
  const filter: Record<string, unknown> = {};
  if (!scope.canReadAll) filter.employeeId = scope.ownEmployeeId ?? null;
  const allAttendance = await attendanceModel.find(filter).populate("employeeId", "name email employeeCode").skip(skip).limit(limit);
  const total = await attendanceModel.countDocuments(filter);
  return paginatedResult(allAttendance, total, page, limit);
};

const getAttendanceById = async (_id: string, scope: ReadScope) => {
  if (!_id) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const attendanceById = await attendanceModel.findById(_id);
  if (!attendanceById) throw new AppError(MESSAGES.ATTENDANCE_NOT_FOUND, StatusCode.NOT_FOUND);
  if (!scope.canReadAll && attendanceById.employeeId.toString() !== scope.ownEmployeeId) {
    throw new AppError(MESSAGES.NOT_AUTHORIZED, StatusCode.FORBIDDEN);
  }
  await attendanceById.populate("employeeId", "name email employeeCode");
  return attendanceById;
};

const getAttendanceByEmployee = async (employeeId: string, scope: ReadScope) => {
  if (!employeeId) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);
  if (!scope.canReadAll && employeeId !== scope.ownEmployeeId) {
    throw new AppError(MESSAGES.NOT_AUTHORIZED, StatusCode.FORBIDDEN);
  }

  const attendance = await attendanceModel.find({ employeeId }).populate("employeeId", "name email employeeCode");
  if (!attendance) throw new AppError(MESSAGES.ATTENDANCE_NOT_FOUND, StatusCode.NOT_FOUND);
  return attendance;
};

const getAttendanceByDate = async (date: Date, scope: ReadScope) => {
  if (!date) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const filter: Record<string, unknown> = { date };
  if (!scope.canReadAll) filter.employeeId = scope.ownEmployeeId ?? null;
  const attendance = await attendanceModel.find(filter).populate("employeeId", "name email employeeCode");
  if (!attendance) throw new AppError(MESSAGES.ATTENDANCE_NOT_FOUND, StatusCode.NOT_FOUND);
  return attendance;
};

const getAttendanceByDateRange = async (employeeId: string, startDate: Date, endDate: Date, scope: ReadScope) => {
  if (!employeeId || !startDate || !endDate) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);
  if (!scope.canReadAll && employeeId !== scope.ownEmployeeId) {
    throw new AppError(MESSAGES.NOT_AUTHORIZED, StatusCode.FORBIDDEN);
  }

  const attendance = await attendanceModel.find({
    employeeId,
    date: { $gte: startDate, $lte: endDate },
  }).populate("employeeId", "name email employeeCode");
  if (!attendance) throw new AppError(MESSAGES.ATTENDANCE_NOT_FOUND, StatusCode.NOT_FOUND);
  return attendance;
};

const updateAttendance = async (_id: string, updateData: Partial<CreateAttendanceDTO>) => {
  if (!_id) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const updatedAttendance = await attendanceModel.findByIdAndUpdate(_id, updateData, { returnDocument: 'after' }).populate("employeeId", "name email employeeCode");
  if (!updatedAttendance) throw new AppError(MESSAGES.ATTENDANCE_NOT_FOUND, StatusCode.NOT_FOUND);

  return updatedAttendance;
};

const deleteAttendance = async (_id: string) => {
  if (!_id) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const deletedAttendance = await attendanceModel.findByIdAndDelete(_id);

  return deletedAttendance;
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
