jest.mock('../services/attendance.services', () => ({
  __esModule: true,
  default: { addAttendance: jest.fn() },
}));

jest.mock('../utils/helper/ownership', () => ({
  ...jest.requireActual('../utils/helper/ownership'),
  resolveReadScope: jest.fn(),
}));

import attendanceController from '../controllers/attendance.controller';
import attendanceServices from '../services/attendance.services';
import { resolveReadScope } from '../utils/helper/ownership';

const addAttendance = attendanceServices.addAttendance as jest.Mock;
const scopeOf = resolveReadScope as jest.Mock;

const response = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => jest.clearAllMocks());

describe('POST /attendance is scoped to the caller', () => {
  it('refuses to log attendance for a colleague', async () => {
    scopeOf.mockResolvedValue({ canReadAll: false, ownEmployeeId: 'emp-me' });
    const res = response();

    await attendanceController.addAttendance(
      {
        userId: 'user-1',
        body: { employeeId: 'emp-colleague', checkIn: '2026-05-09T09:00:00.000Z' },
      } as never,
      res,
    );

    expect(res.status).toHaveBeenCalledWith(403);
    expect(addAttendance).not.toHaveBeenCalled();
  });

  it('allows logging the caller’s own attendance', async () => {
    scopeOf.mockResolvedValue({ canReadAll: false, ownEmployeeId: 'emp-me' });
    addAttendance.mockResolvedValue({ _id: 'a1' });
    const res = response();

    await attendanceController.addAttendance(
      { userId: 'user-1', body: { employeeId: 'emp-me' } } as never,
      res,
    );

    expect(addAttendance).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('allows HR to log attendance for anyone', async () => {
    scopeOf.mockResolvedValue({ canReadAll: true, roleName: 'hr' });
    addAttendance.mockResolvedValue({ _id: 'a2' });
    const res = response();

    await attendanceController.addAttendance(
      { userId: 'user-2', body: { employeeId: 'emp-anyone' } } as never,
      res,
    );

    expect(addAttendance).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });
});
