import mongoose, { Schema, Document } from 'mongoose';

export interface IOrganizationSetting extends Document {
  organizationName: string;
  email: string;
  phone?: string;
  address?: string;
  workingDays: number[];
  logoUrl?: string;
}
const organizationSettingSchema = new Schema<IOrganizationSetting>({
  organizationName: { type: String, required: true },
  email: { type: String, required: true, lowercase: true },
  phone: { type: String, trim: true },
  address: { type: String, trim: true },
  workingDays: { type: [Number], enum: [0, 1, 2, 3, 4, 5, 6], default: [1, 2, 3, 4, 5] }, // 0=Sun, 1=Mon...
  logoUrl: { type: String }
}, { timestamps: true });
export default mongoose.model<IOrganizationSetting>('Organization', organizationSettingSchema);
