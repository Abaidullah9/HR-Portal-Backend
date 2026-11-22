import mongoose, { Schema, Document } from 'mongoose';


export interface IAttendance extends Document {
  organizationId?: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  date: Date;
  /** Calendar day in the organisation timezone, so day filters do not depend on server time. */
  dateKey?: string;
  checkIn?: Date;
  checkOut?: Date;
  /** Set when an employee asks for a correction and a manager approves it. */
  regularized?: boolean;
  regularizationNote?: string;
}
const attendanceSchema = new Schema<IAttendance>({
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
  employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
  date: { type: Date, required: true, index: true },
  dateKey: { type: String, match: /^\d{4}-\d{2}-\d{2}$/, index: true },
  checkIn: { type: Date },
  checkOut: { type: Date },
  regularized: { type: Boolean, default: false },
  regularizationNote: { type: String, trim: true },
}, { timestamps: true });
attendanceSchema.index({ employeeId: 1, dateKey: 1 }, { unique: true, sparse: true });
export default mongoose.model<IAttendance>('Attendance', attendanceSchema);
