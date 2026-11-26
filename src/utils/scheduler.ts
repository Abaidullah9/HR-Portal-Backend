import leaveBalanceServices from '../services/leaveBalance.services';
import documentServices from '../services/document.services';
import employeeServices from '../services/employee.services';
import { removeStoredFile } from './storage';
import { logger } from './logger';
import { todayKey } from './dates';
import { withJobLock } from './jobLock';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Daily maintenance. Runs immediately on boot (so a restart after downtime
 * catches up) and then once a day. `unref` keeps the timer from holding the
 * process open during tests and shutdown.
 *
 * Each job takes a lease first: two API instances behind a load balancer both
 * boot the scheduler, and without the lease every run would happen twice.
 */
export const startSchedulers = () => {
  const accrue = () => {
    void withJobLock('leave-accrual', () => leaveBalanceServices.accrueLeaveBalances())
      .then((result) => {
        if (result && result.updated > 0) logger.info('scheduler.leave-accrued', { updated: result.updated });
      })
      .catch((error) => logger.error('scheduler.leave-accrual-failed', { error: (error as Error)?.message }));
  };

  const purgeExpiredDocuments = () => {
    void withJobLock('document-retention', async () => {
      const documents = await documentServices.expiredDocuments();
      for (const document of documents) {
        if (document.storageKey) await removeStoredFile(document.storageKey);
        await document.deleteOne();
      }
      return documents.length;
    })
      .then((count) => {
        if (count && count > 0) {
          logger.info('scheduler.documents-purged', { count, day: todayKey() });
        }
      })
      .catch((error) => logger.error('scheduler.document-retention-failed', { error: (error as Error)?.message }));
  };

  const offboardDueEmployees = () => {
    void withJobLock('employee-offboarding', () => employeeServices.runScheduledOffboarding())
      .then((result) => {
        if (result && result.employees > 0) {
          logger.info('scheduler.offboarding-completed', {
            employees: result.employees,
            logins: result.logins,
            organizations: result.organizations,
          });
        }
      })
      .catch((error) => logger.error('scheduler.offboarding-failed', { error: (error as Error)?.message }));
  };

  accrue();
  purgeExpiredDocuments();
  offboardDueEmployees();

  const timer = setInterval(() => {
    accrue();
    purgeExpiredDocuments();
    offboardDueEmployees();
  }, DAY_MS);
  timer.unref();
};
