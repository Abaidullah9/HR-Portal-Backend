/**
 * By-id tenancy.
 *
 * List queries were scoped long ago, but the by-id paths were not: a record was
 * fetched by `_id` alone and then checked against the caller's person scope.
 * That scope says "HR may read anybody", which is true inside one organisation
 * and false across two. These tests pin the organisation into the query itself
 * and prove that a cross-organisation id answers 404, not data — even to a
 * caller whose scope allows reading every employee.
 */
jest.mock('../models/employeePayroll.model', () => ({
  findOne: jest.fn(),
  findById: jest.fn(),
}));

jest.mock('../models/document.model', () => ({
  findOne: jest.fn(),
}));

jest.mock('../models/attendance.model', () => ({
  findOne: jest.fn(),
  findById: jest.fn(),
}));

import { Types } from 'mongoose';
import { runWithContext } from '../utils/context';
import employeePayrollServices from '../services/employeePayroll.services';
import documentServices from '../services/document.services';
import attendanceServices from '../services/attendance.services';

const ORG = '64b7f0c2f1a2b3c4d5e6f7a8';
const RECORD = '64b7f0c2f1a2b3c4d5e6f7ff';

/** HR/Admin scope: allowed to read any employee *within* the organisation. */
const broadScope = { canReadAll: true };

const payrollModel = jest.requireMock('../models/employeePayroll.model') as { findOne: jest.Mock };
const documentModel = jest.requireMock('../models/document.model') as { findOne: jest.Mock };
const attendanceModel = jest.requireMock('../models/attendance.model') as { findOne: jest.Mock };

beforeEach(() => jest.clearAllMocks());

describe('by-id reads are tenant scoped', () => {
  it('scopes the payslip lookup and hides a record from another organisation', async () => {
    // The record belongs to another organisation, so the scoped query matches
    // nothing even though the caller may read every employee in their own.
    payrollModel.findOne.mockReturnValue({ populate: jest.fn().mockResolvedValue(null) });

    await expect(
      runWithContext({ requestId: 'r1', userId: 'u1', organizationId: ORG }, () =>
        employeePayrollServices.getPayslip(RECORD, broadScope),
      ),
    ).rejects.toMatchObject({ statusCode: 404 });

    const filter = payrollModel.findOne.mock.calls[0]![0] as Record<string, unknown>;
    expect(filter._id).toBe(RECORD);
    expect((filter.organizationId as Types.ObjectId).toString()).toBe(ORG);
  });

  it('scopes the document lookup, so a downloaded file cannot come from another tenant', async () => {
    documentModel.findOne.mockResolvedValue(null);

    await expect(
      runWithContext({ requestId: 'r2', userId: 'u1', organizationId: ORG }, () =>
        documentServices.getDocumentById(RECORD, broadScope),
      ),
    ).rejects.toMatchObject({ statusCode: 404 });

    const filter = documentModel.findOne.mock.calls[0]![0] as Record<string, unknown>;
    expect((filter.organizationId as Types.ObjectId).toString()).toBe(ORG);
  });

  it('scopes the attendance lookup', async () => {
    attendanceModel.findOne.mockResolvedValue(null);

    await expect(
      runWithContext({ requestId: 'r3', userId: 'u1', organizationId: ORG }, () =>
        attendanceServices.getAttendanceById(RECORD, broadScope),
      ),
    ).rejects.toMatchObject({ statusCode: 404 });

    const filter = attendanceModel.findOne.mock.calls[0]![0] as Record<string, unknown>;
    expect((filter.organizationId as Types.ObjectId).toString()).toBe(ORG);
  });

  it('leaves background work unscoped, so the seed and scripts still run', async () => {
    attendanceModel.findOne.mockResolvedValue(null);

    await expect(attendanceServices.getAttendanceById(RECORD, broadScope)).rejects.toBeTruthy();

    const filter = attendanceModel.findOne.mock.calls[0]![0] as Record<string, unknown>;
    expect(filter).toEqual({ _id: RECORD });
  });
});
