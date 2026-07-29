export interface CreateLeaveRequestDTO {
  employeeId: string;
  leaveType: string;
  fromDate: Date;
  toDate: Date;
  reasonForLeave: string;
}

export interface UpdateLeaveRequestDTO {
  leaveType?: string;
  fromDate?: Date;
  toDate?: Date;
  reasonForLeave?: string;
}

export interface ApproveRejectLeaveDTO {
  leaveStatus: 'approved' | 'rejected';
  approvedById: string;
  rejectionReason?: string;
}
