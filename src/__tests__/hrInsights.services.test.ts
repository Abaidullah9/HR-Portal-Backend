jest.mock('../models/user.model', () => ({ findById: jest.fn() }));
jest.mock('../models/role.model', () => ({ findById: jest.fn() }));
jest.mock('../models/employee.model', () => ({
  findOne: jest.fn(),
  find: jest.fn(() => ({ select: jest.fn().mockResolvedValue([]) })),
  countDocuments: jest.fn(),
}));
jest.mock('../models/attendance.model', () => ({ countDocuments: jest.fn() }));
jest.mock('../models/leaveRequest.model', () => ({ countDocuments: jest.fn() }));

import hrInsightsServices from '../services/hrInsights.services';

describe('Dashboard summary permissions', () => {
  let userModel: any;
  let roleModel: any;
  let employeeModel: any;
  let attendanceModel: any;
  let leaveRequestModel: any;

  beforeEach(() => {
    jest.clearAllMocks();
    userModel = require('../models/user.model');
    roleModel = require('../models/role.model');
    employeeModel = require('../models/employee.model');
    attendanceModel = require('../models/attendance.model');
    leaveRequestModel = require('../models/leaveRequest.model');
  });

  const setupRole = (actionNames: string[], roleName = 'Employee') => {
    userModel.findById.mockResolvedValue({ _id: 'u1', roleId: 'r1' });
    roleModel.findById.mockReturnValue({
      roleName,
      populate: jest.fn().mockResolvedValue({ actions: actionNames.map((name) => ({ actionName: name })) }),
    });
    employeeModel.findOne.mockResolvedValue({ _id: 'emp1' });
    employeeModel.countDocuments.mockResolvedValue(5);
    attendanceModel.countDocuments.mockResolvedValue(2);
    leaveRequestModel.countDocuments.mockResolvedValue(1);
  };

  it('returns an empty summary when the role holds no read actions', async () => {
    setupRole([], 'Employee');
    const summary = await hrInsightsServices.dashboardSummary('u1');
    expect(summary).toEqual({});
  });

  it('includes only the employee group for read_Employee', async () => {
    setupRole(['read_Employee'], 'HR');
    // HR is not admin/hr? name HR -> resolveReadScope grants canReadAll. Fine.
    const summary = await hrInsightsServices.dashboardSummary('u1');
    expect(summary.employees).toEqual({ total: 5, active: 5 });
    expect(summary.attendance).toBeUndefined();
    expect(summary.leaves).toBeUndefined();
  });

  it('includes attendance and leaves groups for their read actions', async () => {
    setupRole(['read_Attendance', 'read_LeaveRequest'], 'Manager');
    // Manager is not admin/hr, so resolveReadScope uses employeeModel.findOne -> emp1.
    const summary = await hrInsightsServices.dashboardSummary('u1');
    expect(summary.attendance).toEqual({ presentToday: 2 });
    expect(summary.leaves).toEqual({ onLeave: 1, pending: 1 });
    expect(summary.employees).toBeUndefined();
  });

  it('includes every group for an Admin', async () => {
    setupRole(
      ['read_Employee', 'read_Attendance', 'read_LeaveRequest'],
      'Admin',
    );
    const summary = await hrInsightsServices.dashboardSummary('u1');
    expect(summary.employees).toBeDefined();
    expect(summary.attendance).toBeDefined();
    expect(summary.leaves).toBeDefined();
  });
});