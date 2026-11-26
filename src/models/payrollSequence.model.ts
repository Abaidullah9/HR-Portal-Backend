import mongoose, { Schema, Document } from 'mongoose';

/**
 * Atomic payslip-number allocation.
 *
 * `PS-YYYYMM-NNNN` has to be unique per organisation and period, and it must not
 * depend on the order employees came out of a query. A counter document is
 * incremented with `$inc` in a single atomic findOneAndUpdate, so two concurrent
 * approvals can never hand out the same number. The counter is keyed by the pay
 * period (the month the work was done), not by the day the slip was printed.
 */
export interface IPayrollSequence extends Document {
  organizationId?: mongoose.Types.ObjectId | null;
  /** Pay-period month, `YYYY-MM`. */
  periodKey: string;
  seq: number;
}

const payrollSequenceSchema = new Schema<IPayrollSequence>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', default: null },
    periodKey: { type: String, required: true, match: /^\d{4}-\d{2}$/ },
    seq: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

// A missing organisation is stored as null so the context-free path (seed, tests,
// jobs) still has exactly one counter per period instead of a shared missing value.
payrollSequenceSchema.index({ organizationId: 1, periodKey: 1 }, { unique: true });

export default mongoose.model<IPayrollSequence>('PayrollSequence', payrollSequenceSchema);
