import mongoose, { Schema, Document } from 'mongoose';

export interface IOrganizationSetting extends Document {
  organizationName: string;
  email: string;
  phone?: string;
  address?: string;
  workingDays: number[];
  /** Local time after which a check-in counts as late, e.g. "09:15". */
  lateAfter?: string;
  /** ISO code payroll and payslips are denominated in. */
  currency?: string;
  /** Withhold salaried income tax on generated payroll. */
  taxEnabled?: boolean;
  /** Deduct the employee's EOBI contribution. */
  eobiEnabled?: boolean;
  /** Monthly minimum wage the EOBI contribution is based on. */
  minimumWage?: number;
  /** Employee share of basic salary contributed to the provident fund. */
  providentFundEmployeePercent?: number;
  /** Employer share, recorded for cost reporting but never deducted. */
  providentFundEmployerPercent?: number;
  logoUrl?: string;
}
const organizationSettingSchema = new Schema<IOrganizationSetting>({
  organizationName: { type: String, required: true },
  email: { type: String, required: true, lowercase: true },
  phone: { type: String, trim: true },
  address: { type: String, trim: true },
  workingDays: { type: [Number], enum: [0, 1, 2, 3, 4, 5, 6], default: [1, 2, 3, 4, 5] }, // 0=Sun, 1=Mon...
  lateAfter: { type: String, default: '09:15', match: /^([01]\d|2[0-3]):[0-5]\d$/ },
  currency: { type: String, default: 'PKR', uppercase: true, trim: true, match: /^[A-Z]{3}$/ },
  taxEnabled: { type: Boolean, default: true },
  eobiEnabled: { type: Boolean, default: true },
  minimumWage: { type: Number, default: 37000, min: 0 },
  providentFundEmployeePercent: { type: Number, default: 0, min: 0, max: 100 },
  providentFundEmployerPercent: { type: Number, default: 0, min: 0, max: 100 },
  logoUrl: { type: String }
}, { timestamps: true });
export default mongoose.model<IOrganizationSetting>('Organization', organizationSettingSchema);
