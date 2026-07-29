export interface CreateEmployeeDTO {
  organizationId: string;
  userId: string;
  employeeCode: string;
  name: string;
  email: string;
  departmentId: string;
  reportingManagerId?: string;
  position: string;
  employmentType: 'full-time' | 'contract' | 'intern';
  isActive?: boolean;
  joiningDate: Date;
  exitDate?: Date;
}

export interface UpdateEmployeeDTO {
  name?: string;
  email?: string;
  departmentId?: string;
  reportingManagerId?: string;
  position?: string;
  employmentType?: 'full-time' | 'contract' | 'intern';
  isActive?: boolean;
  joiningDate?: Date;
  exitDate?: Date;
}
