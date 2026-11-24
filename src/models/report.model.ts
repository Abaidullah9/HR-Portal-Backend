import mongoose, { Schema, Document } from 'mongoose';

export interface IReport extends Document {
  reportName: string;
  category: string;
  generatedBy: mongoose.Types.ObjectId;
  lastGenerated: Date;
  fileUrl?: string;
}
const reportSchema = new Schema<IReport>({
  reportName: { type: String, required: true, trim: true },
  category: { type: String, required: true },
  generatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  lastGenerated: { type: Date, required: true, default: Date.now, index: true },
  fileUrl: { type: String }
}, { timestamps: true });

// Reports are read by category, most recently generated first.
reportSchema.index({ category: 1, lastGenerated: -1 });

export default mongoose.model<IReport>('Report', reportSchema);
