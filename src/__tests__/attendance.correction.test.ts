jest.mock('../models/attendance.model', () => ({
  find: jest.fn(),
  countDocuments: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
}));

import attendanceServices from '../services/attendance.services';
import attendanceModelMock from '../models/attendance.model';

const attendanceModel = attendanceModelMock as unknown as {
  findById: jest.Mock;
  findByIdAndUpdate: jest.Mock;
};

const OWN = { canReadAll: false, ownEmployeeId: 'emp-me' };

beforeEach(() => jest.clearAllMocks());

describe('attendance corrections', () => {
  it('rejects a time change without a note', async () => {
    attendanceModel.findById.mockResolvedValue({
      employeeId: { toString: () => 'emp-me' },
    });

    await expect(
      attendanceServices.updateAttendance(
        'a1',
        { checkIn: '2026-05-09T08:55:00.000Z' },
        OWN,
      ),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(attendanceModel.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('records the note and flags the day as regularised', async () => {
    attendanceModel.findById.mockResolvedValue({
      employeeId: { toString: () => 'emp-me' },
    });
    attendanceModel.findByIdAndUpdate.mockReturnValue({
      populate: jest.fn().mockResolvedValue({ _id: 'a1' }),
    });

    await attendanceServices.updateAttendance(
      'a1',
      { checkIn: '2026-05-09T08:55:00.000Z', regularizationNote: '  Badge reader was down  ' },
      OWN,
    );

    expect(attendanceModel.findByIdAndUpdate).toHaveBeenCalledWith(
      'a1',
      expect.objectContaining({
        regularized: true,
        regularizationNote: 'Badge reader was down',
      }),
      { returnDocument: 'after' },
    );
  });

  it('still refuses a colleague’s record', async () => {
    attendanceModel.findById.mockResolvedValue({
      employeeId: { toString: () => 'emp-other' },
    });

    await expect(
      attendanceServices.updateAttendance('a1', { regularizationNote: 'x' }, OWN),
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});
