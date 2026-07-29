import mongoose, { Schema, Document } from 'mongoose';


export interface IInterview extends Document {
  candidateId: mongoose.Types.ObjectId;
  interviewerId: mongoose.Types.ObjectId;
  scheduledAt: Date;
  mode: 'in-person' | 'phone' | 'video';
  round: string;
  feedback?: string;
  rating?: number;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
}
const interviewSchema = new Schema<IInterview>({
  candidateId: { type: Schema.Types.ObjectId, ref: 'Candidate', required: true, index: true },
  interviewerId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
  scheduledAt: { type: Date, required: true, index: true },
  mode: { type: String, enum: ['in-person', 'phone', 'video'], required: true },
  round: { type: String, required: true }, // e.g., '1st', 'Technical', 'HR'
  feedback: { type: String, trim: true },
  rating: { type: Number, min: 1, max: 5 },
  status: { type: String, enum: ['scheduled', 'completed', 'cancelled', 'no-show'], default: 'scheduled', index: true }
}, { timestamps: true });
export default mongoose.model<IInterview>('Interview', interviewSchema);
