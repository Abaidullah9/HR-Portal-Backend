jest.mock('../models/attendance.model', () => ({
  find: jest.fn(),
  countDocuments: jest.fn(),
  findOne: jest.fn(),
}));
jest.mock('../models/employee.model', () => ({
  findOne: jest.fn(),
  countDocuments: jest.fn(),
}));

import attendanceServices from '../services/attendance.services';

describe('Attendance services', () => {
  let attendanceModel: any;

  beforeEach(() => {
    jest.clearAllMocks();
    attendanceModel = require('../models/attendance.model');
  });

  const chain = (rows: any[]) => {
    const obj: any = { populate: jest.fn(), sort: jest.fn(), skip: jest.fn(), limit: jest.fn() };
    obj.populate.mockReturnValue(obj);
    obj.sort.mockReturnValue(obj);
    obj.skip.mockReturnValue(obj);
    obj.limit.mockResolvedValue(rows);
    return obj;
  };

  it('getAllAttendance scopes to the caller when they cannot read all', async () => {
    let captured: any;
    attendanceModel.find.mockImplementation((f: any) => {
      captured = f;
      return chain([]);
    });
    attendanceModel.countDocuments.mockResolvedValue(0);

    await attendanceServices.getAllAttendance({ page: '1', limit: '10' } as any, {
      canReadAll: false,
      ownEmployeeId: 'emp42',
    });

    // Manager scopes also include direct reports.
    expect(captured.employeeId).toEqual({ $in: ['emp42'] });
  });

  it('getAllAttendance leaves the filter open for canReadAll', async () => {
    let captured: any;
    attendanceModel.find.mockImplementation((f: any) => {
      captured = f;
      return chain([]);
    });
    attendanceModel.countDocuments.mockResolvedValue(0);

    await attendanceServices.getAllAttendance({ page: '1', limit: '10' } as any, {
      canReadAll: true,
    });

    expect(captured).toEqual({});
  });

  it('getAllAttendance adds a full-day date range when a date is supplied', async () => {
    let captured: any;
    attendanceModel.find.mockImplementation((f: any) => {
      captured = f;
      return chain([]);
    });
    attendanceModel.countDocuments.mockResolvedValue(0);

    await attendanceServices.getAllAttendance(
      { page: '1', limit: '10', date: '2026-05-09' } as any,
      { canReadAll: true },
    );

    // Days are resolved in the organisation timezone (Asia/Karachi by default),
    // server's local timezone.
    // Pakistan Standard Time is UTC+5, so the local day starts at 19:00 UTC.
    const start = new Date(Date.UTC(2026, 4, 8, 19));
    expect(captured.date).toBeDefined();
    expect(captured.date.$gte.getTime()).toBe(start.getTime());
    expect(captured.date.$lt.getTime()).toBe(start.getTime() + 24 * 60 * 60 * 1000);
  });

  it('getAttendanceByDate filters the whole calendar day, not midnight exactly', async () => {
    let captured: any;
    const chainObj: any = { populate: jest.fn().mockResolvedValue([]) };
    attendanceModel.find.mockImplementation((f: any) => {
      captured = f;
      return chainObj;
    });

    await attendanceServices.getAttendanceByDate(new Date(2026, 4, 9, 15, 30), {
      canReadAll: true,
    });

    // Pakistan Standard Time is UTC+5, so the local day starts at 19:00 UTC.
    const start = new Date(Date.UTC(2026, 4, 8, 19));
    expect(captured.date.$gte.getTime()).toBe(start.getTime());
    expect(captured.date.$lt.getTime()).toBe(start.getTime() + 24 * 60 * 60 * 1000);
  });

  it('getAttendanceByDate scopes to the caller when they cannot read all', async () => {
    let captured: any;
    const chainObj2: any = { populate: jest.fn().mockResolvedValue([]) };
    attendanceModel.find.mockImplementation((f: any) => {
      captured = f;
      return chainObj2;
    });

    await attendanceServices.getAttendanceByDate(new Date(2026, 4, 9), {
      canReadAll: false,
      ownEmployeeId: 'emp7',
    });

    expect(captured.employeeId).toEqual({ $in: ['emp7'] });
  });

  it('getAttendanceById throws for another employees record', async () => {
    const doc = {
      employeeId: { toString: () => 'other' },
      populate: jest.fn().mockResolvedValue(undefined),
    };
    attendanceModel.findOne.mockResolvedValue(doc);

    await expect(
      attendanceServices.getAttendanceById('a1', { canReadAll: false, ownEmployeeId: 'emp1' }),
    ).rejects.toThrow();
  });

  it('getAttendanceByEmployee throws for another employees records', async () => {
    await expect(
      attendanceServices.getAttendanceByEmployee('emp2', { canReadAll: false, ownEmployeeId: 'emp1' }),
    ).rejects.toThrow();
  });
});