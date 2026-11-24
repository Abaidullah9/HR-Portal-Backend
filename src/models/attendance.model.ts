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
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization' },
  employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  date: { type: Date, required: true },
  dateKey: { type: String, match: /^\d{4}-\d{2}-\d{2}$/ },
  checkIn: { type: Date },
  checkOut: { type: Date },
  regularized: { type: Boolean, default: false },
  regularizationNote: { type: String, trim: true },
}, { timestamps: true });
// One record per person per calendar day: the register is the source of truth
// for payroll hours, so a duplicate day must be rejected by the database.
attendanceSchema.index({ employeeId: 1, dateKey: 1 }, { unique: true, sparse: true });
// Attendance lists are read per organisation and per employee, newest first.
attendanceSchema.index({ organizationId: 1, employeeId: 1, date: -1 });
export default mongoose.model<IAttendance>('Attendance', attendanceSchema);
