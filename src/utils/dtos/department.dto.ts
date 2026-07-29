export interface CreateDepartmentDTO {
  name: string;
  managerId?: string;
  parentId?: string;
  description?: string;
}

export interface UpdateDepartmentDTO {
  name?: string;
  managerId?: string;
  parentId?: string;
  description?: string;
}
