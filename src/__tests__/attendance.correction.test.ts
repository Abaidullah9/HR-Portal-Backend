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

const record = (over: Record<string, unknown> = {}) => ({
  employeeId: { toString: () => 'emp-me' },
  checkIn: new Date('2026-05-09T08:55:00.000Z'),
  checkOut: null,
  ...over,
});

beforeEach(() => jest.clearAllMocks());

describe('attendance updates', () => {
  it('logs a first check-out without asking for a note', async () => {
    attendanceModel.findById.mockResolvedValue(record());
    attendanceModel.findByIdAndUpdate.mockReturnValue({
      populate: jest.fn().mockResolvedValue({ _id: 'a1' }),
    });

    await attendanceServices.updateAttendance(
      'a1',
      { checkOut: '2026-05-09T18:00:00.000Z' },
      OWN,
    );

    expect(attendanceModel.findByIdAndUpdate).toHaveBeenCalledWith(
      'a1',
      { checkOut: '2026-05-09T18:00:00.000Z' },
      { returnDocument: 'after' },
    );
  });

  it('rejects a correction without a note', async () => {
    attendanceModel.findById.mockResolvedValue(record());

    await expect(
      attendanceServices.updateAttendance('a1', { checkIn: '2026-05-09T09:30:00.000Z' }, OWN),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(attendanceModel.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('rejects moving a check-out that was already recorded', async () => {
    attendanceModel.findById.mockResolvedValue(record({ checkOut: '2026-05-09T18:00:00.000Z' }));

    await expect(
      attendanceServices.updateAttendance('a1', { checkOut: '2026-05-09T19:00:00.000Z' }, OWN),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('records the note and flags the day as regularised', async () => {
    attendanceModel.findById.mockResolvedValue(record());
    attendanceModel.findByIdAndUpdate.mockReturnValue({
      populate: jest.fn().mockResolvedValue({ _id: 'a1' }),
    });

    await attendanceServices.updateAttendance(
      'a1',
      { checkIn: '2026-05-09T08:45:00.000Z', regularizationNote: '  Badge reader was down  ' },
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

  it('drops a stray note when nothing is being corrected', async () => {
    attendanceModel.findById.mockResolvedValue(record());
    attendanceModel.findByIdAndUpdate.mockReturnValue({
      populate: jest.fn().mockResolvedValue({ _id: 'a1' }),
    });

    await attendanceServices.updateAttendance('a1', { regularizationNote: 'unused' }, OWN);

    expect(attendanceModel.findByIdAndUpdate).toHaveBeenCalledWith(
      'a1',
      {},
      { returnDocument: 'after' },
    );
  });

  it('still refuses a colleague’s record', async () => {
    attendanceModel.findById.mockResolvedValue(
      record({ employeeId: { toString: () => 'emp-other' } }),
    );

    await expect(
      attendanceServices.updateAttendance('a1', { regularizationNote: 'x' }, OWN),
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});
