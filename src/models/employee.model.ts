import mongoose, { Schema, Document } from 'mongoose';


export interface IEmployee extends Document {
  organizationId: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId;
  employeeCode: string;
  name: string;
  email: string;
  departmentId: mongoose.Types.ObjectId;
  reportingManagerId?: mongoose.Types.ObjectId;
  position: string;
  employmentType: 'full-time' | 'contract' | 'intern';
  isActive : boolean;
  /** Monthly base salary, the source for generated payroll records. */
  salary?: number;
  joiningDate: Date;
  exitDate?: Date;
}
const employeeSchema = new Schema<IEmployee>({
  organizationId : {type : Schema.Types.ObjectId,ref : 'Organization',required : true},
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  employeeCode: { type: String, required: true, unique: true, sparse: true, index: true },
  name: { type: String, required: true, trim: true, index: true },
  email: { type: String, required: true, lowercase: true, trim: true, index: true },
  departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
  reportingManagerId: { type: Schema.Types.ObjectId, ref: 'Employee' },
  position: { type: String, required: true, index: true },
  employmentType: { type: String, enum: ['full-time', 'contract', 'intern'], required: true },
  isActive: { type:Boolean, default: true },
  salary: { type: Number, min: 0 },
  joiningDate: { type: Date, required: true, index: true },
  exitDate: { type: Date }
}, { timestamps: true });

// The roster is read per organisation, filtered by activity or department, and
// sorted by name by default. Each compound covers its filter plus that sort, so
// the single-field indexes on those columns are gone rather than duplicated.
employeeSchema.index({ organizationId: 1, isActive: 1, name: 1 });
employeeSchema.index({ organizationId: 1, departmentId: 1, name: 1 });
// Direct reports: "who sits under this manager".
employeeSchema.index({ organizationId: 1, reportingManagerId: 1 });

export default mongoose.model<IEmployee>('Employee', employeeSchema);
