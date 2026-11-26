import crypto from 'crypto';
import jobLockModel from '../models/jobLock.model';
import { logger } from './logger';
import { requestIdOf } from './context';

/** How long a crashed job's lease is honoured before another instance takes over. */
const DEFAULT_LEASE_MS = 15 * 60 * 1000;

/**
 * Runs `job` only if this process can take the named lease.
 *
 * Two API instances behind a load balancer both boot the scheduler, so without
 * a lease the daily accrual, retention purge and offboarding sweep would each
 * run twice. The lease is short-lived and self-healing: an expired lock is
 * taken over rather than blocking forever.
 */
export const withJobLock = async <T>(
  name: string,
  job: () => Promise<T>,
  leaseMs: number = DEFAULT_LEASE_MS,
): Promise<T | null> => {
  const owner = `${requestIdOf()}:${process.pid}:${crypto.randomBytes(4).toString('hex')}`;
  const now = new Date();
  const until = new Date(now.getTime() + leaseMs);

  const existing = await jobLockModel.findOne({ name });
  if (!existing) {
    try {
      await jobLockModel.create({ name, lockedUntil: until, lockedBy: owner });
    } catch (error) {
      // Another instance inserted the lock between the read and the write.
      if ((error as { code?: number }).code === 11000) return null;
      throw error;
    }
  } else {
    if (existing.lockedUntil > now) return null;
    const taken = await jobLockModel.findOneAndUpdate(
      { _id: existing._id, lockedUntil: { $lte: now } },
      { $set: { lockedUntil: until, lockedBy: owner } },
      { returnDocument: 'after' },
    );
    if (!taken) return null;
  }

  try {
    return await job();
  } finally {
    await jobLockModel
      .updateOne({ name, lockedBy: owner }, { $set: { lockedUntil: new Date(0) } })
      .catch((error) => logger.error('scheduler.lock-release-failed', { job: name, error: (error as Error)?.message }));
  }
};
