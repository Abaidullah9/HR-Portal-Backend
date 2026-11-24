import mongoose, { Schema, Document } from 'mongoose';



export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  roleId: mongoose.Types.ObjectId;
  /** Tenant boundary for every person-scoped query. */
  organizationId?: mongoose.Types.ObjectId;
  isActive: boolean;
  lastLogin?: Date;
  /** SHA-256 of the one-time reset token; the raw token only lives in the link. */
  resetToken?: string;
  resetTokenExpires?: Date;
  /** SHA-256 of an invite token, used until the invited person sets a password. */
  inviteToken?: string;
  inviteTokenExpires?: Date;
  /** Bumped on password change so old sessions can be told apart. */
  passwordChangedAt?: Date;
  /**
   * Session generation. Tokens carry the value they were minted with; bumping
   * this field makes every previously issued token stop working.
   */
  tokenVersion?: number;
}
const userSchema = new Schema<IUser>({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  password: { type: String, required: true, select: false },
  roleId: { type: Schema.Types.ObjectId, ref: 'Role', required: true, index: true },
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
  isActive: { type: Boolean, default: true, index: true },
  lastLogin: { type: Date },
  resetToken: { type: String, select: false },
  resetTokenExpires: { type: Date, select: false },
  inviteToken: { type: String, select: false },
  inviteTokenExpires: { type: Date, select: false },
  passwordChangedAt: { type: Date },
  tokenVersion: { type: Number, default: 0 }
}, { timestamps: true });
export default mongoose.model<IUser>('User', userSchema);
