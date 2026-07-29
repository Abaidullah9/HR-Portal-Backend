import mongoose, { Schema, Document } from 'mongoose';


export interface IEmployeePayroll extends Document {
  employeeId: mongoose.Types.ObjectId;
  baseSalary: number;
  allowances: { type: string; amount: number; taxable: boolean }[];
  deductions: { type: string; amount: number; note?: string }[];
  bonuses: { type: string; amount: number; note?: string }[];
  netPay: number;
  payPeriodStart: Date;
  payPeriodEnd: Date;
  datePaid?: Date;
  paymentMethod: 'bank transfer' | 'cheque' | 'cash';
  status: 'pending' | 'completed' | 'failed';
}
const payrollSchema = new Schema<IEmployeePayroll>({
  employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
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
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending', index: true }
}, { timestamps: true });
payrollSchema.index({ employeeId: 1, payPeriodStart: 1 });
export default mongoose.model<IEmployeePayroll>('EmployeePayroll', payrollSchema);
