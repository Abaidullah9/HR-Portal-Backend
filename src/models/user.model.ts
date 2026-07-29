import mongoose, { Schema, Document } from 'mongoose';



export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  roleId: mongoose.Types.ObjectId;
  isActive: boolean;
  lastLogin?: Date;
}
const userSchema = new Schema<IUser>({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  password: { type: String, required: true, select: false },
  roleId: { type: Schema.Types.ObjectId, ref: 'Role', required: true, index: true },
  isActive: { type: Boolean, default: true, index: true },
  lastLogin: { type: Date }
}, { timestamps: true });
export default mongoose.model<IUser>('User', userSchema);
