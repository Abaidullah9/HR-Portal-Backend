import mongoose, { Schema, Document } from 'mongoose';
export interface IAction extends Document {
  actionName: string;
  actionDescription: string;

}
const actionSchema = new Schema<IAction>({
  actionName: { type: String, required: true, trim: true },
  actionDescription: { type: String, required: true, trim: true },
}, { timestamps: true });
actionSchema.index({ actionName: 1 }, { unique: true });
export default mongoose.model<IAction>('Action', actionSchema);
