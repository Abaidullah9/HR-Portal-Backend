import mongoose, { Schema, Document } from 'mongoose';

export interface IEmployeeDocument extends Document {
  employeeId: mongoose.Types.ObjectId;
  name: string;
  type: 'resume' | 'id_proof' | 'certificate' | 'contract' | 'other';
  fileUrl: string;
  uploadedBy: mongoose.Types.ObjectId;
}

const documentSchema = new Schema<IEmployeeDocument>({
  employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
  name: { type: String, required: true, trim: true },
  type: { type: String, enum: ['resume', 'id_proof', 'certificate', 'contract', 'other'], required: true },
  fileUrl: { type: String, required: true },
  uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

export default mongoose.model<IEmployeeDocument>('EmployeeDocument', documentSchema);