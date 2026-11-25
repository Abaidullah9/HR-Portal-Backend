import { StatusCode } from '../utils/helper/constants/enum';
import { AppError } from '../utils/helper/AppError';
import attendanceModel from '../models/attendance.model';
import { CreateAttendanceDTO } from '../utils/dtos/attendance.dto';
import { MESSAGES } from '../utils/helper/constants/messages';
import { getPagination, paginatedResult, PaginationQuery } from '../utils/common';
import { canAccessEmployee, scopeEmployeeFilter, type ReadScope } from '../utils/helper/ownership';
import { tenantFields, tenantFilter } from '../utils/context';
import { dayKey, dayRangeFilter, isDayKey, startOfDay } from '../utils/dates';

const addAttendance = async (attendanceData: CreateAttendanceDTO) => {
  if (!attendanceData) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);
  if (!attendanceData.employeeId) throw new AppError(MESSAGES.EMPLOYEE_ID_REQUIRED, StatusCode.BAD_REQUEST);

  const date = attendanceData.date ? new Date(attendanceData.date) : new Date();
  if (Number.isNaN(date.getTime())) throw new AppError(MESSAGES.INVALID_DATE_FORMAT, StatusCode.BAD_REQUEST);
  const key = dayKey(date);

  const existing = await attendanceModel.findOne({ employeeId: attendanceData.employeeId, dateKey: key });
  if (existing) {
    throw new AppError(`Attendance for ${key} already exists. Ask a manager to regularize it instead.`, StatusCode.CONFLICT);
  }

  // The unique index is on the calendar key, so a second check-in the same day
  // is rejected rather than silently creating two rows.
  const newAttendance = await attendanceModel.create({
    ...attendanceData,
    ...tenantFields(),
    date: startOfDay(key),
    dateKey: key,
    checkIn: attendanceData.checkIn ?? new Date(),
  });
  return newAttendance;
};

const getAllAttendance = async (
  query: PaginationQuery & { date?: string },
  scope: ReadScope,
) => {
  const { page, limit, skip } = getPagination(query);
  const filter: Record<string, unknown> = tenantFilter(scopeEmployeeFilter(scope));

  // Paging applies to the filter, so the day filter has to be part of it rather
  // than something the client trims after the fact.
  if (typeof query.date === 'string' && query.date) {
    filter.date = isDayKey(query.date) ? dayRangeFilter(query.date) : dayRangeFilter(dayKey(new Date(query.date)));
  }

  const allAttendance = await attendanceModel
    .find(filter)
    .populate('employeeId', 'name email employeeCode')
    .sort({ date: -1 })
    .skip(skip)
    .limit(limit);
  const total = await attendanceModel.countDocuments(filter);
  return paginatedResult(allAttendance, total, page, limit);
};

const getAttendanceById = async (_id: string, scope: ReadScope) => {
  if (!_id) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const attendanceById = await attendanceModel.findById(_id);
  if (!attendanceById) throw new AppError(MESSAGES.ATTENDANCE_NOT_FOUND, StatusCode.NOT_FOUND);
  if (!canAccessEmployee(scope, attendanceById.employeeId.toString())) {
    throw new AppError(MESSAGES.NOT_AUTHORIZED, StatusCode.FORBIDDEN);
  }
  await attendanceById.populate('employeeId', 'name email employeeCode');
  return attendanceById;
};

const getAttendanceByEmployee = async (employeeId: string, scope: ReadScope) => {
  if (!employeeId) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);
  if (!canAccessEmployee(scope, employeeId)) {
    throw new AppError(MESSAGES.NOT_AUTHORIZED, StatusCode.FORBIDDEN);
  }

  return attendanceModel
    .find(tenantFilter({ employeeId }))
    .populate('employeeId', 'name email employeeCode')
    .sort({ date: -1 });
};

const getAttendanceByDate = async (date: Date, scope: ReadScope) => {
  if (!date) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const filter: Record<string, unknown> = tenantFilter({
    ...scopeEmployeeFilter(scope),
    date: dayRangeFilter(dayKey(date)),
  });
  return attendanceModel.find(filter).populate('employeeId', 'name email employeeCode');
};

const getAttendanceByDateRange = async (
  employeeId: string,
  startDate: Date,
  endDate: Date,
  scope: ReadScope,
) => {
  if (!employeeId || !startDate || !endDate) {
    throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);
  }
  if (!canAccessEmployee(scope, employeeId)) {
    throw new AppError(MESSAGES.NOT_AUTHORIZED, StatusCode.FORBIDDEN);
  }

  return attendanceModel
    .find({
      employeeId,
      date: { $gte: startOfDay(dayKey(startDate)), $lte: endDate },
    })
    .populate('employeeId', 'name email employeeCode');
};

const updateAttendance = async (
  _id: string,
  updateData: Partial<CreateAttendanceDTO> & { regularizationNote?: string },
  scope: ReadScope,
) => {
  if (!_id) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const existing = await attendanceModel.findById(_id);
  if (!existing) throw new AppError(MESSAGES.ATTENDANCE_NOT_FOUND, StatusCode.NOT_FOUND);
  if (!canAccessEmployee(scope, existing.employeeId.toString())) {
    throw new AppError(MESSAGES.NOT_AUTHORIZED, StatusCode.FORBIDDEN);
  }

  // Changing a recorded time is a correction, not an edit: it has to say why,
  // because these hours feed payroll and the note is what makes it auditable.
  const note = updateData.regularizationNote?.trim();
  const changesTime = Boolean(updateData.checkIn || updateData.checkOut);
  if (changesTime && !note) {
    throw new AppError(
      'Add a note explaining the attendance correction',
      StatusCode.BAD_REQUEST,
    );
  }

  const updatedAttendance = await attendanceModel
    .findByIdAndUpdate(
      _id,
      changesTime ? { ...updateData, regularized: true, regularizationNote: note } : updateData,
      { returnDocument: 'after' },
    )
    .populate('employeeId', 'name email employeeCode');
  if (!updatedAttendance) throw new AppError(MESSAGES.ATTENDANCE_NOT_FOUND, StatusCode.NOT_FOUND);

  return updatedAttendance;
};

const deleteAttendance = async (_id: string, scope: ReadScope) => {
  if (!_id) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const existing = await attendanceModel.findById(_id);
  if (!existing) throw new AppError(MESSAGES.ATTENDANCE_NOT_FOUND, StatusCode.NOT_FOUND);
  if (!canAccessEmployee(scope, existing.employeeId.toString())) {
    throw new AppError(MESSAGES.NOT_AUTHORIZED, StatusCode.FORBIDDEN);
  }

  return attendanceModel.findByIdAndDelete(_id);
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
