export interface SkillRatingDTO {
  skillName: string;
  skillRating: number;
  targetRating: number;
}

export interface GoalDTO {
  goalName: string;
  goalCompletionRate?: number;
  deadline?: Date;
  completionStatus?: 'completed' | 'in_progress' | 'pending';
}

export interface CreateAppraisalDTO {
  employeeId: string;
  cycleId: string;
  appraiserId: string;
  reviewDate?: Date;
  overallRating?: number;
  goalsCompleted?: number;
  feedbackReceived?: number;
  skillsRating?: SkillRatingDTO[];
  goals?: GoalDTO[];
  status?: 'pending' | 'completed';
}

export interface UpdateAppraisalDTO {
  reviewDate?: Date;
  overallRating?: number;
  goalsCompleted?: number;
  feedbackReceived?: number;
  skillsRating?: SkillRatingDTO[];
  goals?: GoalDTO[];
  status?: 'pending' | 'completed';
}
