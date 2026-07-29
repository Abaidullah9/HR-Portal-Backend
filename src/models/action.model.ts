import mongoose, { Schema, Document } from 'mongoose';
export interface IAction extends Document {
  actionName: string;
  actionDescription: string;
  module: string;
}
const actionSchema = new Schema<IAction>({
  actionName: { type: String, required: true, unique: true, trim: true },
  actionDescription: { type: String, required: true, trim: true },
  module: { type: String, required: true, index: true } 
}, { timestamps: true });
export default mongoose.model<IAction>('Action', actionSchema);
