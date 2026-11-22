import mongoose, { Schema, Document } from 'mongoose';

export interface IChecklistTemplate extends Document {
  organizationId?: mongoose.Types.ObjectId;
  type: 'onboarding' | 'offboarding';
  title: string;
  /** Where the task belongs in the UI. */
  category: 'people' | 'it' | 'payroll' | 'compliance' | 'manager';
  /** Due this many days after the joining/leaving date (negative = before). */
  dueOffsetDays: number;
  active: boolean;
}

const checklistTemplateSchema = new Schema<IChecklistTemplate>({
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
  type: { type: String, enum: ['onboarding', 'offboarding'], required: true, index: true },
  title: { type: String, required: true, trim: true },
  category: {
    type: String,
    enum: ['people', 'it', 'payroll', 'compliance', 'manager'],
    default: 'people',
  },
  dueOffsetDays: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model<IChecklistTemplate>('ChecklistTemplate', checklistTemplateSchema);
