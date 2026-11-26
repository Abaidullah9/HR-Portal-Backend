import mongoose, { Schema, Document } from 'mongoose';

/**
 * A lease that stops two API instances running the same daily job at once.
 *
 * The lock is a timestamp rather than a boolean: if the process holding it
 * dies, the lease expires and the next run takes over. A job that finishes
 * early releases the lease so the next boot does not wait for the TTL.
 */
export interface IJobLock extends Document {
  name: string;
  lockedUntil: Date;
  lockedBy: string;
  updatedAt: Date;
}

const jobLockSchema = new Schema<IJobLock>(
  {
    name: { type: String, required: true, unique: true },
    lockedUntil: { type: Date, required: true },
    lockedBy: { type: String, required: true },
  },
  { timestamps: true },
);

export default mongoose.model<IJobLock>('JobLock', jobLockSchema);
