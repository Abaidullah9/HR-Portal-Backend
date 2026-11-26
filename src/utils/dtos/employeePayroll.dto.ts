export interface AllowanceDTO {
  type: string;
  amount: number;
  taxable?: boolean;
}

export interface DeductionDTO {
  type: string;
  amount: number;
  note?: string;
}

export interface BonusDTO {
  type: string;
  amount: number;
  note?: string;
}

export interface CreatePayrollDTO {
  employeeId: string;
  baseSalary: number;
  allowances?: AllowanceDTO[];
  deductions?: DeductionDTO[];
  bonuses?: BonusDTO[];
  /** Rejected by the service: net pay is computed from the lines. */
  netPay?: number;
  /**
   * Required when the caller supplies statutory deduction lines themselves
   * (Income tax, EOBI, Provident fund). The reason is kept in the audit trail.
   */
  overrideReason?: string;
  payPeriodStart: Date;
  payPeriodEnd: Date;
  datePaid?: Date;
  paymentMethod: 'bank transfer' | 'cheque' | 'cash';
  status?: 'pending' | 'completed' | 'failed';
}

export interface UpdatePayrollDTO {
  baseSalary?: number;
  allowances?: AllowanceDTO[];
  deductions?: DeductionDTO[];
  bonuses?: BonusDTO[];
  /** Rejected by the service: net pay is computed from the lines. */
  netPay?: number;
  /** Required when overriding the statutory deduction lines. */
  overrideReason?: string;
  payPeriodStart?: Date;
  payPeriodEnd?: Date;
  datePaid?: Date;
  paymentMethod?: 'bank transfer' | 'cheque' | 'cash';
  status?: 'pending' | 'completed' | 'failed';
}
