export interface CreateJobPostingDTO {
  position: string;
  departmentId: string;
  description: string;
  requirements?: string[];
  numberOfOpenings?: number;
  postedBy: string;
  postedOnDate?: Date;
  closingDate?: Date;
  status?: 'open' | 'closed' | 'on-hold';
}

export interface UpdateJobPostingDTO {
  position?: string;
  departmentId?: string;
  description?: string;
  requirements?: string[];
  numberOfOpenings?: number;
  closingDate?: Date;
  status?: 'open' | 'closed' | 'on-hold';
}
