import attendanceModel from '../models/attendance.model';
import employeeModel from '../models/employee.model';
import holidayModel from '../models/holiday.model';
import leaveRequestModel from '../models/leaveRequest.model';
import organizationSettingModel from '../models/organizationSetting.model';
import { tenantFilter } from '../utils/context';
import {
  dayKey,
  dayRangeFilter,
  endOfDay,
  isDayKey,
  minutesOfDay,
  parseClock,
  startOfDay,
} from '../utils/dates';

export interface WorkforceDay {
  date: string;
  totalEmployees: number;
  present: number;
  late: number;
  onLeave: number;
  absent: number;
  isHoliday: boolean;
  holidayName?: string;
  checkInRate: number | null;
  lateAfter: string;
  onLeaveEmployees: { employeeId: string; name: string; leaveType: string }[];
}

/**
 * "Who is working today" for the dashboard and the attendance page.
 *
 * Absence is no longer `headcount - check-ins`: someone on approved leave or a
 * public holiday is accounted for, and only the remainder is actually absent.
 */
export const workforceForDay = async (input?: string): Promise<WorkforceDay> => {
  const date = isDayKey(input) ? input : dayKey(new Date());
  const range = dayRangeFilter(date);

  const [employees, attendance, approvedLeave, holiday, settings] = await Promise.all([
    employeeModel.find(tenantFilter({ isActive: true })).select('_id name').lean(),
    attendanceModel.find(tenantFilter({ date: range })).lean(),
    leaveRequestModel
      .find(
        tenantFilter({
          leaveStatus: 'approved',
          fromDate: { $lt: endOfDay(date) },
          toDate: { $gte: startOfDay(date) },
        }),
      )
      .populate('employeeId', 'name')
      .lean(),
    holidayModel.findOne(tenantFilter({ date })).lean(),
    organizationSettingModel.findOne().lean(),
  ]);

  const lateAfter = settings?.lateAfter || '09:15';
  const threshold = parseClock(lateAfter);

  const present = attendance.filter((record) => Boolean(record.checkIn)).length;
  const late = attendance.filter(
    (record) => record.checkIn && minutesOfDay(new Date(record.checkIn)) > threshold,
  ).length;

  const onLeaveEmployees = approvedLeave.map((request) => {
    const employee = request.employeeId as unknown as { _id?: { toString(): string }; name?: string } | null;
    return {
      employeeId: employee?._id?.toString() ?? '',
      name: employee?.name ?? 'Unknown employee',
      leaveType: request.leaveType,
    };
  });

  const onLeaveIds = new Set(onLeaveEmployees.map((entry) => entry.employeeId));
  const totalEmployees = employees.length;
  const onLeave = onLeaveIds.size;

  return {
    date,
    totalEmployees,
    present,
    late,
    onLeave,
    absent: Math.max(0, totalEmployees - present - onLeave),
    isHoliday: Boolean(holiday),
    ...(holiday?.name ? { holidayName: holiday.name } : {}),
    checkInRate: totalEmployees > 0 ? Math.round((present / totalEmployees) * 100) : null,
    lateAfter,
    onLeaveEmployees,
  };
};

export default { workforceForDay };
