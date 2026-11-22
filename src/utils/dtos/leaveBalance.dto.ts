export interface CreateLeaveBalanceDTO {
  employeeId: string;
  leaveType: string;
  totalAllocated: number;
  used?: number;
  remaining?: number;
  year: number;
  accrualRate?: number;
}

export interface UpdateLeaveBalanceDTO {
  totalAllocated?: number;
  used?: number;
  remaining?: number;
}
