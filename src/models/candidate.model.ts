import mongoose, { Schema, Document } from 'mongoose';

export interface ICandidate extends Document {
  organizationId?: mongoose.Types.ObjectId;
  jobPostingId: mongoose.Types.ObjectId;
  name: string;
  email: string;
  phone?: string;
  source: string;
  appliedDate: Date;
  status: 'applied' | 'screening' | 'interview' | 'offered' | 'hired' | 'rejected';
  resume?: string;
  notes?: string;
  /** Offer tracking so a hire can be converted without retyping the person. */
  offer?: {
    salary?: number;
    currency?: string;
    position?: string;
    startDate?: string;
    sentAt?: Date;
    acceptedAt?: Date;
    declinedAt?: Date;
  };
  /** Employee created by the hire conversion, so it cannot happen twice. */
  hiredEmployeeId?: mongoose.Types.ObjectId;
  stageChangedAt?: Date;
}
const candidateSchema = new Schema<ICandidate>({
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
  jobPostingId: { type: Schema.Types.ObjectId, ref: 'JobPosting', required: true, index: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  phone: { type: String, trim: true },
  source: { type: String, required: true },
  appliedDate: { type: Date, required: true, default: Date.now, index: true },
  status: { type: String, enum: ['applied', 'screening', 'interview', 'offered', 'hired', 'rejected'], default: 'applied', index: true },
  resume: { type: String },
  notes: { type: String, trim: true },
  offer: {
    salary: { type: Number, min: 0 },
    currency: { type: String, uppercase: true, trim: true },
    position: { type: String, trim: true },
    startDate: { type: String, match: /^\d{4}-\d{2}-\d{2}$/ },
    sentAt: { type: Date },
    acceptedAt: { type: Date },
    declinedAt: { type: Date }
  },
  hiredEmployeeId: { type: Schema.Types.ObjectId, ref: 'Employee' },
  stageChangedAt: { type: Date }
}, { timestamps: true });
export default mongoose.model<ICandidate>('Candidate', candidateSchema);
