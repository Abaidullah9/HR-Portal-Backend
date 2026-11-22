import { Request, Response } from 'express';
import { sendErrorResponse } from '../utils/helper/sendError';
import compensationServices from '../services/compensation.services';
import { StatusCode } from '../utils/helper/constants/enum';
import { resolveReadScope, canAccessEmployee } from '../utils/helper/ownership';
import { AppError } from '../utils/helper/AppError';
import { MESSAGES } from '../utils/helper/constants/messages';

const listForEmployee = async (req: Request, res: Response) => {
  try {
    const employeeId = req.params.employeeId as string;
    const scope = await resolveReadScope(req.userId!);
    if (!canAccessEmployee(scope, employeeId)) {
      throw new AppError(MESSAGES.NOT_AUTHORIZED, StatusCode.FORBIDDEN);
    }
    const data = await compensationServices.listCompensation(employeeId);
    res.status(StatusCode.OK).json({ success: true, message: 'Compensation history fetched', data });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const addCompensation = async (req: Request, res: Response) => {
  try {
    const data = await compensationServices.recordCompensation(req.body, req.userId);
    res.status(StatusCode.CREATED).json({ success: true, message: 'Compensation recorded', data });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

export default { listForEmployee, addCompensation };
