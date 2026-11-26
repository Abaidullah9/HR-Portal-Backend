import mongoose, { Schema, Document } from 'mongoose';

export interface IRole extends Document {
  roleName: string;
  actions: mongoose.Types.ObjectId[];
  /** Roles belong to one organisation: "Manager" means that tenant's Manager. */
  organizationId?: mongoose.Types.ObjectId;
}
const roleSchema = new Schema<IRole>({
  roleName: { type: String, required: true, trim: true },
  actions: [{ type: Schema.Types.ObjectId, ref: 'Action' }],
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
}, { timestamps: true });
// Role names are unique per organisation, not globally, so a second tenant can
// have its own Admin and Manager roles without colliding with this one.
roleSchema.index({ organizationId: 1, roleName: 1 }, { unique: true, sparse: true });
export default mongoose.model<IRole>('Role', roleSchema);
