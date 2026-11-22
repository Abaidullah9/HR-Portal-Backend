import mongoose, { Schema, Document } from 'mongoose';

export interface IChecklistTask extends Document {
  organizationId?: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  type: 'onboarding' | 'offboarding';
  title: string;
  category: 'people' | 'it' | 'payroll' | 'compliance' | 'manager';
  status: 'open' | 'done' | 'skipped';
  dueDate?: string;
  ownerId?: mongoose.Types.ObjectId;
  completedAt?: Date;
  completedBy?: mongoose.Types.ObjectId;
  notes?: string;
}

const checklistTaskSchema = new Schema<IChecklistTask>({
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
  employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
  type: { type: String, enum: ['onboarding', 'offboarding'], required: true, index: true },
  title: { type: String, required: true, trim: true },
  category: {
    type: String,
    enum: ['people', 'it', 'payroll', 'compliance', 'manager'],
    default: 'people',
  },
  status: { type: String, enum: ['open', 'done', 'skipped'], default: 'open', index: true },
  dueDate: { type: String, match: /^\d{4}-\d{2}-\d{2}$/ },
  ownerId: { type: Schema.Types.ObjectId, ref: 'User' },
  completedAt: { type: Date },
  completedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  notes: { type: String, trim: true },
}, { timestamps: true });

checklistTaskSchema.index({ employeeId: 1, type: 1, status: 1 });

export default mongoose.model<IChecklistTask>('ChecklistTask', checklistTaskSchema);
