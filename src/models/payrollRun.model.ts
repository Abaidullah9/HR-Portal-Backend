import mongoose, { Schema, Document } from 'mongoose';

export type PayrollRunStatus = 'draft' | 'approved' | 'paid' | 'reversed';

export interface IPayrollRun extends Document {
  organizationId?: mongoose.Types.ObjectId;
  periodStart: string;
  periodEnd: string;
  status: PayrollRunStatus;
  employeeCount: number;
  totalNetPay: number;
  currency: string;
  notes?: string;
  /**
   * Client-supplied key that makes `POST /payroll-runs` safe to retry. Two
   * requests carrying the same key resolve to the same run instead of paying
   * everyone twice.
   */
  idempotencyKey?: string;
  createdBy?: mongoose.Types.ObjectId;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  paidAt?: Date;
  reversedAt?: Date;
  reversalReason?: string;
}

const payrollRunSchema = new Schema<IPayrollRun>({
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
  periodStart: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/, index: true },
  periodEnd: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  status: { type: String, enum: ['draft', 'approved', 'paid', 'reversed'], default: 'draft', index: true },
  employeeCount: { type: Number, default: 0 },
  totalNetPay: { type: Number, default: 0 },
  currency: { type: String, default: 'PKR', uppercase: true, trim: true },
  notes: { type: String, trim: true },
  idempotencyKey: { type: String, trim: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  approvedAt: { type: Date },
  paidAt: { type: Date },
  reversedAt: { type: Date },
  reversalReason: { type: String, trim: true },
}, { timestamps: true });

// Deliberately not unique on the period. Reversing a wrong run is the documented
// recovery path, and the replacement run covers the same dates; a unique period
// index turned that path into E11000. Overlapping non-reversed runs are refused
// by `generateRun`'s overlap query, which is the rule that actually matters.
payrollRunSchema.index({ organizationId: 1, periodStart: 1, periodEnd: 1 });

// One run per idempotency key. Partial rather than sparse so runs created without
// a key are not all treated as sharing a null key.
payrollRunSchema.index(
  { organizationId: 1, idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } },
);

export default mongoose.model<IPayrollRun>('PayrollRun', payrollRunSchema);
