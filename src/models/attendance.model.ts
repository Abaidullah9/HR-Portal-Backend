import mongoose, { Schema, Document } from 'mongoose';


export interface IAttendance extends Document {
  employeeId: mongoose.Types.ObjectId;
  date: Date;
  checkIn?: Date;
  checkOut?: Date;
}
const attendanceSchema = new Schema<IAttendance>({
  employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
  date: { type: Date, required: true, index: true }, 
  checkIn: { type: Date },
  checkOut: { type: Date },
}, { timestamps: true });
attendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });
export default mongoose.model<IAttendance>('Attendance', attendanceSchema);
