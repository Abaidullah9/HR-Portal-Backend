import mongoose, { Schema, Document } from 'mongoose';


export interface ILeaveRequest extends Document {
  employeeId: mongoose.Types.ObjectId;
  leaveType: string;
  fromDate: Date;
  toDate: Date;
  leaveStatus: 'pending' | 'approved' | 'rejected' | 'cancelled';
  approvedById?: mongoose.Types.ObjectId;
  rejectionReason?: string;
  reasonForLeave: string;
}
const leaveRequestSchema = new Schema<ILeaveRequest>({
  employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
  leaveType: { type: String, required: true, index: true },
  fromDate: { type: Date, required: true, index: true },
  toDate: { type: Date, required: true },
  leaveStatus: { type: String, enum: ['pending', 'approved', 'rejected', 'cancelled'], default: 'pending', index: true },
  approvedById: { type: Schema.Types.ObjectId, ref: 'Employee' },
  rejectionReason: { type: String, trim: true },
  reasonForLeave: { type: String, required: true, trim: true }
}, { timestamps: true });
export default mongoose.model<ILeaveRequest>('LeaveRequest', leaveRequestSchema);
