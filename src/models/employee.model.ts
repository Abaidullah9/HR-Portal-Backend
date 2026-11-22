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
  organizationId : {type : Schema.Types.ObjectId,ref : 'Organization',required : true, index : true},
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  employeeCode: { type: String, required: true, unique: true, sparse: true, index: true },
  name: { type: String, required: true, trim: true, index: true },
  email: { type: String, required: true, lowercase: true, trim: true, index: true },
  departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true, index: true },
  reportingManagerId: { type: Schema.Types.ObjectId, ref: 'Employee', index: true },
  position: { type: String, required: true, index: true },
  employmentType: { type: String, enum: ['full-time', 'contract', 'intern'], required: true },
  isActive: { type:Boolean, default: true, index: true },
  salary: { type: Number, min: 0 },
  joiningDate: { type: Date, required: true, index: true },
  exitDate: { type: Date }
}, { timestamps: true });
export default mongoose.model<IEmployee>('Employee', employeeSchema);
