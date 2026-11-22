import mongoose, { Schema, Document } from 'mongoose';


export interface ILeaveRequest extends Document {
  organizationId?: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  leaveType: string;
  fromDate: Date;
  toDate: Date;
  leaveStatus: 'pending' | 'approved' | 'rejected' | 'cancelled';
  approvedById?: mongoose.Types.ObjectId;
  rejectionReason?: string;
  reasonForLeave: string;
  /** Chargeable days at approval time, so weekends/holidays are not deducted. */
  workingDays?: number;
}
const leaveRequestSchema = new Schema<ILeaveRequest>({
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
  employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
  leaveType: { type: String, required: true, index: true },
  fromDate: { type: Date, required: true, index: true },
  toDate: { type: Date, required: true },
  leaveStatus: { type: String, enum: ['pending', 'approved', 'rejected', 'cancelled'], default: 'pending', index: true },
  approvedById: { type: Schema.Types.ObjectId, ref: 'Employee' },
  rejectionReason: { type: String, trim: true },
  reasonForLeave: { type: String, required: true, trim: true },
  workingDays: { type: Number, min: 0 }
}, { timestamps: true });
export default mongoose.model<ILeaveRequest>('LeaveRequest', leaveRequestSchema);
