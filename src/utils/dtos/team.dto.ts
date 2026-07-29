export interface CreateTeamDTO {
  teamName: string;
  teamLeadId?: string;
  teamMembers?: { employeeId: string }[];
}

export interface UpdateTeamDTO {
  teamName?: string;
  teamLeadId?: string;
  teamMembers?: { employeeId: string }[];
}

export interface ITeamDTO {
  _id: string;
  teamName: string;
  teamLeadId?: string;
  teamMembers: { employeeId: string }[];
  createdAt?: Date;
  updatedAt?: Date;
}
