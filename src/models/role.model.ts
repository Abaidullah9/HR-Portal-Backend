import mongoose, { Schema, Document } from 'mongoose';

export interface IRole extends Document {
  roleName: string;
  actions: mongoose.Types.ObjectId[];
}
const roleSchema = new Schema<IRole>({
  roleName: { type: String, required: true, unique: true, trim: true },
  actions: [{ type: Schema.Types.ObjectId, ref: 'Action' }]
}, { timestamps: true });
export default mongoose.model<IRole>('Role', roleSchema);
