import mongoose, { Schema, Document } from 'mongoose';


export interface IAppraisal extends Document {
  employeeId: mongoose.Types.ObjectId;
  cycleId: mongoose.Types.ObjectId;
  appraiserId: mongoose.Types.ObjectId;
  reviewDate: Date;
  overallRating?: number;
  goalsCompleted: number;
  feedbackReceived: number;
  skillsRating: { skillName: string; skillRating: number; targetRating: number }[];
  goals: { goalName: string; goalCompletionRate: number; deadline?: Date; completionStatus: string }[];
  status: 'pending' | 'completed';
}
const appraisalSchema = new Schema<IAppraisal>({
  employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
  cycleId: { type: Schema.Types.ObjectId, ref: 'PerformanceCycle', required: true, index: true },
  appraiserId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  reviewDate: { type: Date, required: true, default: Date.now },
  overallRating: { type: Number, min: 0, max: 5 },
  goalsCompleted: { type: Number, default: 0 },
  feedbackReceived: { type: Number, default: 0 },
  skillsRating: [{
    skillName: { type: String, required: true },
    skillRating: { type: Number, required: true, min: 0, max: 5 },
    targetRating: { type: Number, required: true, min: 0, max: 5 }
  }],
  goals: [{
    goalName: { type: String, required: true },
    goalCompletionRate: { type: Number, default: 0, min: 0, max: 100 },
    deadline: { type: Date },
    completionStatus: { type: String, enum: ['completed', 'in_progress', 'pending'], default: 'pending' }
  }],
  status: { type: String, enum: ['pending', 'completed'], default: 'pending', index: true }
}, { timestamps: true });
appraisalSchema.index({ employeeId: 1, cycleId: 1 }, { unique: true });
export default mongoose.model<IAppraisal>('Appraisal', appraisalSchema);
