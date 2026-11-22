import mongoose, { Schema, Document } from 'mongoose';


export interface IEmployeePayroll extends Document {
  organizationId?: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  /** The run that produced this record, when it came from a generated batch. */
  payRunId?: mongoose.Types.ObjectId;
  currency?: string;
  baseSalary: number;
  allowances: { type: string; amount: number; taxable: boolean }[];
  deductions: { type: string; amount: number; note?: string }[];
  bonuses: { type: string; amount: number; note?: string }[];
  netPay: number;
  payPeriodStart: Date;
  payPeriodEnd: Date;
  datePaid?: Date;
  paymentMethod: 'bank transfer' | 'cheque' | 'cash';
  status: 'pending' | 'completed' | 'failed' | 'reversed';
}
const payrollSchema = new Schema<IEmployeePayroll>({
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
  employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
  payRunId: { type: Schema.Types.ObjectId, ref: 'PayrollRun', index: true },
  currency: { type: String, uppercase: true, trim: true, default: 'USD' },
  baseSalary: { type: Number, required: true },
  allowances: [{
    type: { type: String, required: true },
    amount: { type: Number, required: true },
    taxable: { type: Boolean, default: true }
  }],
  deductions: [{
    type: { type: String, required: true },
    amount: { type: Number, required: true },
    note: { type: String, trim: true }
  }],
  bonuses: [{
    type: { type: String, required: true },
    amount: { type: Number, required: true },
    note: { type: String, trim: true }
  }],
  payPeriodStart: { type: Date, required: true, index: true },
  payPeriodEnd: { type: Date, required: true, index: true },
  netPay: { type: Number, required: true },
  datePaid: { type: Date, index: true },
  paymentMethod: { type: String, enum: ['bank transfer', 'cheque', 'cash'], required: true },
  status: { type: String, enum: ['pending', 'completed', 'failed', 'reversed'], default: 'pending', index: true }
}, { timestamps: true });
payrollSchema.index({ employeeId: 1, payPeriodStart: 1 });
export default mongoose.model<IEmployeePayroll>('EmployeePayroll', payrollSchema);
