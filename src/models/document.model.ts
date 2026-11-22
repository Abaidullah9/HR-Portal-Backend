import mongoose, { Schema, Document } from 'mongoose';

export interface IEmployeeDocument extends Document {
  organizationId?: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  name: string;
  type: 'resume' | 'id_proof' | 'certificate' | 'contract' | 'other';
  /** Opaque storage key; the file is only readable through the download route. */
  storageKey?: string;
  /** Legacy field kept so old rows still resolve. */
  fileUrl: string;
  mimeType?: string;
  size?: number;
  /** Documents past this day are removed by the retention job. */
  retentionUntil?: Date;
  uploadedBy: mongoose.Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

const documentSchema = new Schema<IEmployeeDocument>({
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
  employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
  name: { type: String, required: true, trim: true },
  type: { type: String, enum: ['resume', 'id_proof', 'certificate', 'contract', 'other'], required: true },
  storageKey: { type: String, index: true },
  fileUrl: { type: String, required: true },
  mimeType: { type: String },
  size: { type: Number },
  retentionUntil: { type: Date, index: true },
  uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

export default mongoose.model<IEmployeeDocument>('EmployeeDocument', documentSchema);