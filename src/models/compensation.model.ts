import mongoose, { Schema, Document } from 'mongoose';

export interface ICompensation extends Document {
  organizationId?: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  baseSalary: number;
  currency: string;
  /** First day this amount applies, as YYYY-MM-DD. */
  effectiveFrom: string;
  reason: 'initial' | 'raise' | 'promotion' | 'adjustment' | 'correction' | 'rehire';
  note?: string;
  createdBy?: mongoose.Types.ObjectId;
}

const compensationSchema = new Schema<ICompensation>({
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
  employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
  baseSalary: { type: Number, required: true, min: 0 },
  currency: { type: String, required: true, default: 'PKR', trim: true, uppercase: true },
  effectiveFrom: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/, index: true },
  reason: {
    type: String,
    enum: ['initial', 'raise', 'promotion', 'adjustment', 'correction', 'rehire'],
    required: true,
    default: 'adjustment',
  },
  note: { type: String, trim: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

compensationSchema.index({ employeeId: 1, effectiveFrom: -1 });

export default mongoose.model<ICompensation>('Compensation', compensationSchema);
