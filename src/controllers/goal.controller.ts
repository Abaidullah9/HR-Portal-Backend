import { Request, Response } from 'express';
import { sendErrorResponse } from '../utils/helper/sendError';
import goalServices from '../services/goal.services';
import { StatusCode } from '../utils/helper/constants/enum';
import { canAccessEmployee, resolveReadScope } from '../utils/helper/ownership';
import { AppError } from '../utils/helper/AppError';
import { MESSAGES } from '../utils/helper/constants/messages';

const listGoals = async (req: Request, res: Response) => {
  try {
    const scope = await resolveReadScope(req.userId!);
    const employeeId = typeof req.query.employeeId === 'string' ? req.query.employeeId : undefined;

    if (employeeId && !canAccessEmployee(scope, employeeId)) {
      throw new AppError(MESSAGES.NOT_AUTHORIZED, StatusCode.FORBIDDEN);
    }

    // Without an explicit employee the caller sees only their own goals, unless
    // they hold unrestricted scope.
    const effectiveEmployeeId = employeeId ?? (scope.canReadAll ? undefined : scope.ownEmployeeId);
    const data = await goalServices.listGoals({
      ...(effectiveEmployeeId ? { employeeId: effectiveEmployeeId } : {}),
      ...(typeof req.query.cycleId === 'string' ? { cycleId: req.query.cycleId } : {}),
    });
    res.status(StatusCode.OK).json({ success: true, message: 'Goals fetched', data });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const createGoal = async (req: Request, res: Response) => {
  try {
    const data = await goalServices.createGoal(req.body, req.userId);
    res.status(StatusCode.CREATED).json({ success: true, message: 'Goal created', data });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const updateProgress = async (req: Request, res: Response) => {
  try {
    const target = await goalServices.getGoal(req.params._id as string);

    const scope = await resolveReadScope(req.userId!);
    if (!canAccessEmployee(scope, target.employeeId.toString())) {
      throw new AppError(MESSAGES.NOT_AUTHORIZED, StatusCode.FORBIDDEN);
    }

    const data = await goalServices.updateProgress(
      req.params._id as string,
      Number(req.body?.progress),
      req.userId,
      req.body?.status,
    );
    res.status(StatusCode.OK).json({ success: true, message: 'Goal updated', data });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const deleteGoal = async (req: Request, res: Response) => {
  try {
    await goalServices.deleteGoal(req.params._id as string);
    res.status(StatusCode.OK).json({ success: true, message: 'Goal removed' });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

export default { listGoals, createGoal, updateProgress, deleteGoal };
