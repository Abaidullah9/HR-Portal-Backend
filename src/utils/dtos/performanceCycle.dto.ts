export interface CreatePerformanceCycleDTO {
  name: string;
  startDate: Date;
  endDate: Date;
  status?: 'upcoming' | 'active' | 'completed';
}

export interface UpdatePerformanceCycleDTO {
  name?: string;
  startDate?: Date;
  endDate?: Date;
  status?: 'upcoming' | 'active' | 'completed';
}
