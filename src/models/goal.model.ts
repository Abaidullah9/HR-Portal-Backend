import mongoose, { Schema, Document } from 'mongoose';

export interface IGoal extends Document {
  organizationId?: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  cycleId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  /** What "done" means, so a progress percentage is not the only signal. */
  successCriteria?: string;
  progress: number;
  status: 'not_started' | 'in_progress' | 'completed' | 'cancelled';
  dueDate?: string;
  weight: number;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
}

const goalSchema = new Schema<IGoal>({
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
  employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
  cycleId: { type: Schema.Types.ObjectId, ref: 'PerformanceCycle', required: true, index: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  successCriteria: { type: String, trim: true },
  progress: { type: Number, min: 0, max: 100, default: 0 },
  status: {
    type: String,
    enum: ['not_started', 'in_progress', 'completed', 'cancelled'],
    default: 'not_started',
    index: true,
  },
  dueDate: { type: String, match: /^\d{4}-\d{2}-\d{2}$/ },
  weight: { type: Number, min: 0, max: 100, default: 0 },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

goalSchema.index({ employeeId: 1, cycleId: 1 });

export default mongoose.model<IGoal>('Goal', goalSchema);
