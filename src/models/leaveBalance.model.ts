import mongoose, { Schema, Document } from 'mongoose';
export interface ILeaveBalance extends Document {
  organizationId?: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  leaveType: string;
  totalAllocated: number;
  used: number;
  remaining: number;
  year: number;
  /** Days accrued per calendar month; 0 or absent means no automatic accrual. */
  accrualRate?: number;
  lastAccruedAt?: Date;
}
const leaveBalanceSchema = new Schema<ILeaveBalance>({
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
  employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
  leaveType: { type: String, required: true, index: true },
  totalAllocated: { type: Number, required: true, default: 0 },
  used: { type: Number, required: true, default: 0 },
  remaining: { type: Number, required: true, default: 0 },
  year: { type: Number, required: true, index: true },
  accrualRate: { type: Number, min: 0, default: 0 },
  lastAccruedAt: { type: Date }
}, { timestamps: true });
leaveBalanceSchema.index({ employeeId: 1, leaveType: 1, year: 1 }, { unique: true });
export default mongoose.model<ILeaveBalance>('LeaveBalance', leaveBalanceSchema);
