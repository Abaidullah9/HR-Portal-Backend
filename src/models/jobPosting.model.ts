import mongoose, { Schema, Document } from 'mongoose';


export interface IJobPosting extends Document {
  position: string;
  departmentId: mongoose.Types.ObjectId;
  description: string;
  requirements: string[];
  numberOfOpenings: number;
  postedBy: mongoose.Types.ObjectId;
  postedOnDate: Date;
  closingDate?: Date;
  status: 'open' | 'closed' | 'on-hold';
}
const jobPostingSchema = new Schema<IJobPosting>({
  position: { type: String, required: true, index: true },
  departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true, index: true },
  description: { type: String, required: true },
  requirements: [{ type: String }],
  numberOfOpenings: { type: Number, required: true, default: 1 },
  postedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  postedOnDate: { type: Date, required: true, default: Date.now, index: true },
  closingDate: { type: Date },
  status: { type: String, enum: ['open', 'closed', 'on-hold'], default: 'open', index: true }
}, { timestamps: true });
export default mongoose.model<IJobPosting>('JobPosting', jobPostingSchema);
