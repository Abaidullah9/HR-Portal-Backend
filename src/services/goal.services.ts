import mongoose from 'mongoose';
import goalModel from '../models/goal.model';
import appraisalModel from '../models/appraisal.model';
import { AppError } from '../utils/helper/AppError';
import { StatusCode } from '../utils/helper/constants/enum';
import { tenantFields, tenantFilter } from '../utils/context';
import { isDayKey } from '../utils/dates';

export interface GoalInput {
  employeeId: string;
  cycleId: string;
  title: string;
  description?: string;
  successCriteria?: string;
  dueDate?: string;
  weight?: number;
}

export const createGoal = async (input: GoalInput, actorId?: string) => {
  if (!input.employeeId || !input.cycleId || !input.title?.trim()) {
    throw new AppError('A goal needs an employee, a cycle and a title', StatusCode.BAD_REQUEST);
  }
  if (input.dueDate && !isDayKey(input.dueDate)) {
    throw new AppError('Due date must use YYYY-MM-DD', StatusCode.BAD_REQUEST);
  }

  return goalModel.create({
    ...tenantFields(),
    employeeId: input.employeeId,
    cycleId: input.cycleId,
    title: input.title.trim(),
    ...(input.description ? { description: input.description } : {}),
    ...(input.successCriteria ? { successCriteria: input.successCriteria } : {}),
    ...(input.dueDate ? { dueDate: input.dueDate } : {}),
    weight: input.weight ?? 0,
    ...(actorId ? { createdBy: actorId } : {}),
  });
};

export const listGoals = async (filter: { employeeId?: string; cycleId?: string }) => {
  const query: Record<string, unknown> = tenantFilter();
  if (filter.employeeId) query.employeeId = filter.employeeId;
  if (filter.cycleId) query.cycleId = filter.cycleId;
  return goalModel.find(query).sort({ createdAt: 1 });
};

export const getGoal = async (goalId: string) => {
  const goal = await goalModel.findOne(tenantFilter({ _id: goalId }));
  if (!goal) throw new AppError('Goal not found', StatusCode.NOT_FOUND);
  return goal;
};

export const updateProgress = async (
  goalId: string,
  progress: number,
  actorId?: string,
  status?: 'not_started' | 'in_progress' | 'completed' | 'cancelled',
) => {
  if (!Number.isFinite(progress) || progress < 0 || progress > 100) {
    throw new AppError('Progress must be between 0 and 100', StatusCode.BAD_REQUEST);
  }

  const goal = await goalModel.findOne(tenantFilter({ _id: goalId }));
  if (!goal) throw new AppError('Goal not found', StatusCode.NOT_FOUND);

  goal.progress = Math.round(progress);
  goal.status = status ?? (goal.progress >= 100 ? 'completed' : goal.progress > 0 ? 'in_progress' : 'not_started');
  if (actorId) goal.updatedBy = new mongoose.Types.ObjectId(actorId);
  await goal.save();
  return goal;
};

export const deleteGoal = async (goalId: string) => {
  const deleted = await goalModel.findOneAndDelete(tenantFilter({ _id: goalId }));
  if (!deleted) throw new AppError('Goal not found', StatusCode.NOT_FOUND);
  return deleted;
};

/**
 * Copies a cycle's goals onto the appraisal as a snapshot, so the review keeps
 * the goals as they stood when it was written even if the goals are edited later.
 */
export const snapshotGoalsIntoAppraisal = async (appraisalId: string, employeeId: string, cycleId: string) => {
  const [appraisal, goals] = await Promise.all([
    appraisalModel.findById(appraisalId),
    goalModel.find(tenantFilter({ employeeId, cycleId })),
  ]);
  if (!appraisal) throw new AppError('Appraisal not found', StatusCode.NOT_FOUND);
  if (goals.length === 0) return appraisal;

  appraisal.goals = goals.map((goal) => ({
    goalName: goal.title,
    goalCompletionRate: goal.progress,
    ...(goal.dueDate ? { deadline: new Date(`${goal.dueDate}T00:00:00.000Z`) } : {}),
    completionStatus: goal.status === 'completed' ? 'completed' : goal.status === 'in_progress' ? 'in_progress' : 'pending',
  }));
  appraisal.goalsCompleted = goals.filter((goal) => goal.status === 'completed').length;
  await appraisal.save();
  return appraisal;
};

export default {
  createGoal,
  listGoals,
  getGoal,
  updateProgress,
  deleteGoal,
  snapshotGoalsIntoAppraisal,
};
