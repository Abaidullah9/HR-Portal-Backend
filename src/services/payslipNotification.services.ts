import { logger } from '../utils/logger';
import { frontendUrl, sendMail } from '../utils/mailer';

interface NotifiablePayslip {
  payPeriodStart: Date | string;
  payPeriodEnd: Date | string;
  currency?: string;
  /** Populated employee, or an id when the caller did not populate it. */
  employeeId: unknown;
}

const day = (value: Date | string): string => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? '--'
    : parsed.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

/**
 * Tells an employee their payslip is ready, with a link to the portal rather
 * than an attachment: the PDF stays behind the session, and an email is not a
 * safe place for a salary document.
 *
 * Deliberately synchronous and fire-and-forget. Nothing awaits it, so a slow or
 * broken mail provider cannot delay or fail the payroll update that triggered
 * it; the mailer already swallows provider errors, and this catch covers
 * anything it lets through.
 */
export const notifyPayslipCompleted = (record: NotifiablePayslip): void => {
  const employee =
    record.employeeId && typeof record.employeeId === 'object'
      ? (record.employeeId as { name?: string; email?: string })
      : {};
  const email = employee.email;
  if (!email) {
    logger.warn('payslip.notify-skipped', { reason: 'employee has no email' });
    return;
  }

  const link = `${frontendUrl()}/me`;
  const period = `${day(record.payPeriodStart)} – ${day(record.payPeriodEnd)}`;
  const name = employee.name ?? 'there';
  const label = record.currency ? `${record.currency} payslip` : 'payslip';

  void sendMail({
    to: email,
    subject: 'Your payslip is ready',
    text: [
      `Hello ${name},`,
      '',
      `Your ${label} for ${period} has been marked as paid and is available in the HR portal:`,
      link,
      '',
      'Sign in to view or download it as a PDF.',
    ].join('\n'),
  })
    .then((result) => {
      if (!result.delivered) logger.info('payslip.notify-undelivered', { reason: result.reason });
    })
    .catch((error: unknown) => {
      logger.warn('payslip.notify-failed', { error: (error as Error)?.message });
    });
};
