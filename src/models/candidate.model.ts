import mongoose, { Schema, Document } from 'mongoose';

export interface ICandidate extends Document {
  jobPostingId: mongoose.Types.ObjectId;
  name: string;
  email: string;
  phone?: string;
  source: string;
  appliedDate: Date;
  status: 'applied' | 'screening' | 'interview' | 'offered' | 'hired' | 'rejected';
  resume?: string;
  notes?: string;
}
const candidateSchema = new Schema<ICandidate>({
  jobPostingId: { type: Schema.Types.ObjectId, ref: 'JobPosting', required: true, index: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  phone: { type: String, trim: true },
  source: { type: String, required: true },
  appliedDate: { type: Date, required: true, default: Date.now, index: true },
  status: { type: String, enum: ['applied', 'screening', 'interview', 'offered', 'hired', 'rejected'], default: 'applied', index: true },
  resume: { type: String },
  notes: { type: String, trim: true }
}, { timestamps: true });
export default mongoose.model<ICandidate>('Candidate', candidateSchema);
