jest.mock('../utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../utils/mailer', () => ({
  sendMail: jest.fn(),
  frontendUrl: jest.fn(() => 'https://portal.example.com'),
}));

jest.mock('../models/employeePayroll.model', () => ({
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
}));

jest.mock('../services/payslipNotification.services', () => ({
  notifyPayslipCompleted: jest.fn(),
}));

jest.mock('../services/payslipSequence.services', () => ({
  allocatePayslipNumbers: jest.fn().mockResolvedValue(['PS-202605-0001']),
}));

import { sendMail } from '../utils/mailer';
import employeePayrollModelMock from '../models/employeePayroll.model';
import { notifyPayslipCompleted } from '../services/payslipNotification.services';
import employeePayrollServices from '../services/employeePayroll.services';

const sendMailMock = sendMail as jest.Mock;
const notifyMock = notifyPayslipCompleted as jest.Mock;
const payrollModel = employeePayrollModelMock as unknown as {
  findOne: jest.Mock;
  findOneAndUpdate: jest.Mock;
};

const record = {
  payPeriodStart: '2026-05-01T00:00:00.000Z',
  payPeriodEnd: '2026-05-31T00:00:00.000Z',
  employeeId: { name: 'Diana Employee', email: 'diana@techcorp.com' },
};

beforeEach(() => jest.clearAllMocks());

describe('payslip ready notification', () => {
  it('emails a portal link instead of attaching the payslip', async () => {
    sendMailMock.mockResolvedValue({ delivered: true });
    // The real module is replaced in this file, so call it through the mock's
    // implementation captured below.
    const { notifyPayslipCompleted: real } = jest.requireActual<
      typeof import('../services/payslipNotification.services')
    >('../services/payslipNotification.services');

    real(record);
    await Promise.resolve();

    expect(sendMailMock).toHaveBeenCalledTimes(1);
    const message = sendMailMock.mock.calls[0]![0] as {
      to: string;
      subject: string;
      text: string;
      html?: string;
      attachments?: unknown;
    };

    expect(message.to).toBe('diana@techcorp.com');
    expect(message.subject).toBe('Your payslip is ready');
    expect(message.text).toContain('Hello Diana Employee');
    expect(message.text).toContain('May 1, 2026 – May 31, 2026');
    expect(message.text).toContain('https://portal.example.com/me');
    expect(message.text).toContain('PDF');
    expect(message.attachments).toBeUndefined();
    expect(message.html).toBeUndefined();
  });

  it('skips the email when the employee has no address', async () => {
    const { notifyPayslipCompleted: real } = jest.requireActual<
      typeof import('../services/payslipNotification.services')
    >('../services/payslipNotification.services');

    real({ ...record, employeeId: { name: 'No Email' } });
    await Promise.resolve();

    expect(sendMailMock).not.toHaveBeenCalled();
  });

  it('swallows a mail rejection instead of throwing at the caller', async () => {
    sendMailMock.mockRejectedValue(new Error('provider down'));
    const { notifyPayslipCompleted: real } = jest.requireActual<
      typeof import('../services/payslipNotification.services')
    >('../services/payslipNotification.services');

    expect(() => real(record)).not.toThrow();
    await Promise.resolve();
    await Promise.resolve();
  });
});

describe('payroll status transition', () => {
  const chain = (value: unknown) => ({
    populate: jest.fn().mockResolvedValue(value),
  });

  const setStatus = async (from: string, to: string) => {
    payrollModel.findOne.mockResolvedValue({ _id: 'p1', status: from });
    payrollModel.findOneAndUpdate.mockReturnValue(chain({ _id: 'p1', status: to, ...record }));
    await employeePayrollServices.updatePayrollStatus('p1', to);
  };

  it('notifies when a record becomes completed', async () => {
    await setStatus('pending', 'completed');
    expect(notifyMock).toHaveBeenCalledTimes(1);
  });

  it('refuses to re-save a completed record instead of notifying again', async () => {
    await expect(setStatus('completed', 'completed')).rejects.toMatchObject({ statusCode: 409 });
    expect(notifyMock).not.toHaveBeenCalled();
  });

  it('does not notify for a failed or reversed run', async () => {
    await setStatus('pending', 'failed');
    expect(notifyMock).not.toHaveBeenCalled();
  });

  it('returns the updated record without waiting on the mail', async () => {
    // A notification that never settles must not hold up the response.
    notifyMock.mockReturnValue(new Promise(() => {}));
    payrollModel.findOne.mockResolvedValue({ _id: 'p1', status: 'pending' });
    payrollModel.findOneAndUpdate.mockReturnValue(chain({ _id: 'p1', status: 'completed' }));

    await expect(employeePayrollServices.updatePayrollStatus('p1', 'completed')).resolves.toMatchObject({
      status: 'completed',
    });
  });
});
