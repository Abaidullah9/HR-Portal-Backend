import mongoose, { Schema, Document } from 'mongoose';


export interface ILeaveBalance extends Document {
  employeeId: mongoose.Types.ObjectId;
  leaveType: string;
  totalAllocated: number;
  used: number;
  remaining: number;
  year: number;
}
const leaveBalanceSchema = new Schema<ILeaveBalance>({
  employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
  leaveType: { type: String, required: true, index: true },
  totalAllocated: { type: Number, required: true, default: 0 },
  used: { type: Number, required: true, default: 0 },
  remaining: { type: Number, required: true, default: 0 },
  year: { type: Number, required: true, index: true }
}, { timestamps: true });
leaveBalanceSchema.index({ employeeId: 1, leaveType: 1, year: 1 }, { unique: true });
export default mongoose.model<ILeaveBalance>('LeaveBalance', leaveBalanceSchema);
