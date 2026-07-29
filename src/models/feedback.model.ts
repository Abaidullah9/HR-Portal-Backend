import mongoose, { Schema, Document } from 'mongoose';



export interface IFeedback extends Document {
  targetEmployeeId: mongoose.Types.ObjectId;
  reviewerId: mongoose.Types.ObjectId;
  cycleId?: mongoose.Types.ObjectId;
  relationship: 'peer' | 'manager' | 'subordinate' | 'self';
  comment: string;
  rating?: number;
  date: Date;
}
const feedbackSchema = new Schema<IFeedback>({
  targetEmployeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
  reviewerId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
  cycleId: { type: Schema.Types.ObjectId, ref: 'PerformanceCycle', index: true },
  relationship: { type: String, enum: ['peer', 'manager', 'subordinate', 'self'], required: true },
  comment: { type: String, required: true, trim: true },
  rating: { type: Number, min: 0, max: 5 },
  date: { type: Date, required: true, default: Date.now }
}, { timestamps: true });
export default mongoose.model<IFeedback>('Feedback', feedbackSchema);
