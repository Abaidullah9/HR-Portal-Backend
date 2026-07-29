export interface CreateCandidateDTO {
  jobPostingId: string;
  name: string;
  email: string;
  phone?: string;
  source: string;
  appliedDate?: Date;
  status?: 'applied' | 'screening' | 'interview' | 'offered' | 'hired' | 'rejected';
  resume?: string;
  notes?: string;
}

export interface UpdateCandidateDTO {
  name?: string;
  email?: string;
  phone?: string;
  source?: string;
  status?: 'applied' | 'screening' | 'interview' | 'offered' | 'hired' | 'rejected';
  resume?: string;
  notes?: string;
}
