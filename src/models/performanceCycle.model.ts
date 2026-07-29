import mongoose, { Schema, Document } from 'mongoose';


export interface IPerformanceCycle extends Document {
  name: string;
  startDate: Date;
  endDate: Date;
  status: 'upcoming' | 'active' | 'completed';
}
const performanceCycleSchema = new Schema<IPerformanceCycle>({
  name: { type: String, required: true, unique: true },
  startDate: { type: Date, required: true, index: true },
  endDate: { type: Date, required: true },
  status: { type: String, enum: ['upcoming', 'active', 'completed'], default: 'upcoming', index: true }
}, { timestamps: true });
export default mongoose.model<IPerformanceCycle>('PerformanceCycle', performanceCycleSchema);
