import employeeModel from '../models/employee.model';
import attendanceModel from '../models/attendance.model';
import leaveRequestModel from '../models/leaveRequest.model';
import payrollModel from '../models/employeePayroll.model';
import { tenantFilter } from '../utils/context';

const startOfDay = (date: Date) => {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const analyticsSummary = async () => {
  const now = new Date();
  const since = startOfDay(now);
  since.setDate(since.getDate() - 29);
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [
    totalEmployees,
    activeEmployees,
    departments,
    employmentTypes,
    trackedDays,
    presentDays,
    leaveByType,
    payrollTrend,
  ] = await Promise.all([
    employeeModel.countDocuments(tenantFilter()),
    employeeModel.countDocuments(tenantFilter({ isActive: true })),
    employeeModel.aggregate([
      { $match: tenantFilter({ isActive: true }) },
      { $group: { _id: '$departmentId', count: { $sum: 1 } } },
      {
        $lookup: {
          from: 'departments',
          localField: '_id',
          foreignField: '_id',
          as: 'department',
        },
      },
      { $unwind: { path: '$department', preserveNullAndEmptyArrays: true } },
      { $sort: { count: -1 } },
      { $project: { _id: 0, name: { $ifNull: ['$department.name', 'Unassigned'] }, count: 1 } },
    ]),
    employeeModel.aggregate([
      { $match: tenantFilter({ isActive: true }) },
      { $group: { _id: '$employmentType', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $project: { _id: 0, type: '$_id', count: 1 } },
    ]),
    attendanceModel.countDocuments(tenantFilter({ date: { $gte: since } })),
    attendanceModel.countDocuments(tenantFilter({ date: { $gte: since }, checkIn: { $exists: true } })),
    leaveRequestModel.aggregate([
      { $match: tenantFilter({ fromDate: { $gte: yearStart } }) },
      {
        $group: {
          _id: '$leaveType',
          approved: { $sum: { $cond: [{ $eq: ['$leaveStatus', 'approved'] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $eq: ['$leaveStatus', 'pending'] }, 1, 0] } },
        },
      },
      { $sort: { approved: -1 } },
      { $project: { _id: 0, type: '$_id', approved: 1, pending: 1 } },
    ]),
    payrollModel.aggregate([
      { $match: tenantFilter({ payPeriodStart: { $gte: sixMonthsAgo } }) },
      {
        $group: {
          _id: { year: { $year: '$payPeriodStart' }, month: { $month: '$payPeriodStart' } },
          totalNetPay: { $sum: '$netPay' },
          records: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]),
  ]);

  return {
    headcount: {
      total: totalEmployees,
      active: activeEmployees,
      inactive: totalEmployees - activeEmployees,
    },
    departments,
    employmentTypes,
    attendance: {
      trackedDays,
      presentDays,
      rate: trackedDays > 0 ? presentDays / trackedDays : null,
    },
    leaveByType,
    payrollTrend: payrollTrend.map((entry) => ({
      period: `${entry._id.year}-${String(entry._id.month).padStart(2, '0')}`,
      totalNetPay: entry.totalNetPay,
      records: entry.records,
    })),
  };
};

export default { analyticsSummary };
