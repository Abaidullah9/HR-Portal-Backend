export interface CreateOrganizationSettingDTO {
  organizationName: string;
  email: string;
  phone?: string;
  address?: string;
  workingDays?: number[];
  logoUrl?: string;
}

export interface UpdateOrganizationSettingDTO {
  organizationName?: string;
  email?: string;
  phone?: string;
  address?: string;
  workingDays?: number[];
  logoUrl?: string;
}
