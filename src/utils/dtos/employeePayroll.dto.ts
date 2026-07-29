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
  netPay: number;
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
  netPay?: number;
  payPeriodStart?: Date;
  payPeriodEnd?: Date;
  datePaid?: Date;
  paymentMethod?: 'bank transfer' | 'cheque' | 'cash';
  status?: 'pending' | 'completed' | 'failed';
}
