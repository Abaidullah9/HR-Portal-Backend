import leaveBalanceServices from '../services/leaveBalance.services';
import documentServices from '../services/document.services';
import { removeStoredFile } from './storage';
import { logger } from './logger';
import { todayKey } from './dates';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Daily maintenance. Runs immediately on boot (so a restart after downtime
 * catches up) and then once a day. `unref` keeps the timer from holding the
 * process open during tests and shutdown.
 */
export const startSchedulers = () => {
  const accrue = () => {
    void leaveBalanceServices
      .accrueLeaveBalances()
      .then(({ updated }) => {
        if (updated > 0) logger.info('scheduler.leave-accrued', { updated });
      })
      .catch((error) => logger.error('scheduler.leave-accrual-failed', { error: (error as Error)?.message }));
  };

  const purgeExpiredDocuments = () => {
    void documentServices
      .expiredDocuments()
      .then(async (documents) => {
        for (const document of documents) {
          if (document.storageKey) await removeStoredFile(document.storageKey);
          await document.deleteOne();
        }
        if (documents.length > 0) {
          logger.info('scheduler.documents-purged', { count: documents.length, day: todayKey() });
        }
      })
      .catch((error) => logger.error('scheduler.document-retention-failed', { error: (error as Error)?.message }));
  };

  accrue();
  purgeExpiredDocuments();

  const timer = setInterval(() => {
    accrue();
    purgeExpiredDocuments();
  }, DAY_MS);
  timer.unref();
};
