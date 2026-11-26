export interface CreateOrganizationSettingDTO {
  organizationName: string;
  email: string;
  phone?: string;
  address?: string;
  workingDays?: number[];
  lateAfter?: string;
  currency?: string;
  taxEnabled?: boolean;
  eobiEnabled?: boolean;
  minimumWage?: number;
  providentFundEmployeePercent?: number;
  providentFundEmployerPercent?: number;
  logoUrl?: string;
}

export interface UpdateOrganizationSettingDTO {
  organizationName?: string;
  email?: string;
  phone?: string;
  address?: string;
  workingDays?: number[];
  lateAfter?: string;
  currency?: string;
  taxEnabled?: boolean;
  eobiEnabled?: boolean;
  minimumWage?: number;
  providentFundEmployeePercent?: number;
  providentFundEmployerPercent?: number;
  logoUrl?: string;
}
