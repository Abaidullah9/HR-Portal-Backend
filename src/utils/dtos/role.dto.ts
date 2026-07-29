export interface CreateRoleDTO {
  roleName: string;
  actions?: string[];
}

export interface UpdateRoleDTO {
  roleName?: string;
  actions?: string[];
}
