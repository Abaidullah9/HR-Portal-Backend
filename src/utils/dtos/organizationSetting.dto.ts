export interface CreateOrganizationSettingDTO {
  organizationName: string;
  email: string;
  phone?: string;
  address?: string;
  workingDays?: number[];
  lateAfter?: string;
  currency?: string;
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
  logoUrl?: string;
}
