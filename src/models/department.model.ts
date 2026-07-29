import mongoose, { Schema, Document } from 'mongoose';


export interface IDepartment extends Document {
  name: string;
  managerId?: mongoose.Types.ObjectId;
  parentId?: mongoose.Types.ObjectId;
  description?: string;
}
const departmentSchema = new Schema<IDepartment>({
  name: { type: String, required: true, unique: true, trim: true, index: true },
  managerId: { type: Schema.Types.ObjectId, ref: 'Employee' },
  parentId: { type: Schema.Types.ObjectId, ref: 'Department', index: true },
  description: { type: String, trim: true }
}, { timestamps: true });
export default mongoose.model<IDepartment>('Department', departmentSchema);
