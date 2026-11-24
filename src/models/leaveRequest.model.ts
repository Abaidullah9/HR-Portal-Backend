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
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization' },
  employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  leaveType: { type: String, required: true },
  fromDate: { type: Date, required: true },
  toDate: { type: Date, required: true },
  leaveStatus: { type: String, enum: ['pending', 'approved', 'rejected', 'cancelled'], default: 'pending' },
  approvedById: { type: Schema.Types.ObjectId, ref: 'Employee' },
  rejectionReason: { type: String, trim: true },
  reasonForLeave: { type: String, required: true, trim: true },
  workingDays: { type: Number, min: 0 }
}, { timestamps: true });

// The list is always scoped to an organisation and sorted by start date; the
// employee variant narrows it further, and the status variant is what the
// approvals queue and the team calendar read.
leaveRequestSchema.index({ organizationId: 1, fromDate: -1 });
leaveRequestSchema.index({ organizationId: 1, employeeId: 1, fromDate: -1 });
leaveRequestSchema.index({ organizationId: 1, leaveStatus: 1, fromDate: -1 });
// Overlap detection scans one employee's live requests for any range that
// intersects the requested one, so it needs both dates in the key.
leaveRequestSchema.index({ employeeId: 1, leaveStatus: 1, fromDate: 1, toDate: 1 });

export default mongoose.model<ILeaveRequest>('LeaveRequest', leaveRequestSchema);
