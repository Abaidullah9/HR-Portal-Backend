export interface CreateInterviewDTO {
  candidateId: string;
  interviewerId: string;
  scheduledAt: Date;
  mode: 'in-person' | 'phone' | 'video';
  round: string;
  feedback?: string;
  rating?: number;
  status?: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
}

export interface UpdateInterviewDTO {
  scheduledAt?: Date;
  mode?: 'in-person' | 'phone' | 'video';
  round?: string;
  feedback?: string;
  rating?: number;
  status?: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
}
