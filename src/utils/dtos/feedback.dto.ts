export interface CreateFeedbackDTO {
  targetEmployeeId: string;
  reviewerId: string;
  cycleId?: string;
  relationship: 'peer' | 'manager' | 'subordinate' | 'self';
  comment: string;
  rating?: number;
  date?: Date;
}

export interface UpdateFeedbackDTO {
  relationship?: 'peer' | 'manager' | 'subordinate' | 'self';
  comment?: string;
  rating?: number;
}
