import { Request, Response } from 'express';
import { sendErrorResponse } from '../utils/helper/sendError';
import checklistServices from '../services/checklist.services';
import { StatusCode } from '../utils/helper/constants/enum';
import { canAccessEmployee, resolveReadScope } from '../utils/helper/ownership';
import { AppError } from '../utils/helper/AppError';
import { MESSAGES } from '../utils/helper/constants/messages';

const listForEmployee = async (req: Request, res: Response) => {
  try {
    const employeeId = req.params.employeeId as string;
    const scope = await resolveReadScope(req.userId!);
    if (!canAccessEmployee(scope, employeeId)) {
      throw new AppError(MESSAGES.NOT_AUTHORIZED, StatusCode.FORBIDDEN);
    }
    const data = await checklistServices.listTasks(employeeId);
    res.status(StatusCode.OK).json({ success: true, message: 'Checklist fetched', data });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const startChecklist = async (req: Request, res: Response) => {
  try {
    const type = req.body?.type === 'offboarding' ? 'offboarding' : 'onboarding';
    const data = await checklistServices.startChecklist(
      req.params.employeeId as string,
      type,
      req.body?.anchorDate,
    );
    res.status(StatusCode.CREATED).json({ success: true, message: 'Checklist created', data });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const addTask = async (req: Request, res: Response) => {
  try {
    const data = await checklistServices.addTask(
      req.params.employeeId as string,
      req.body,
      req.userId,
    );
    res.status(StatusCode.CREATED).json({ success: true, message: 'Task added', data });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const completeTask = async (req: Request, res: Response) => {
  try {
    const status = ['open', 'done', 'skipped'].includes(req.body?.status)
      ? (req.body.status as 'open' | 'done' | 'skipped')
      : 'done';
    const data = await checklistServices.completeTask(
      req.params._id as string,
      status,
      req.userId,
      req.body?.notes,
    );
    res.status(StatusCode.OK).json({ success: true, message: 'Task updated', data });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const listTemplates = async (req: Request, res: Response) => {
  try {
    const type = req.query.type === 'offboarding' ? 'offboarding' : req.query.type === 'onboarding' ? 'onboarding' : undefined;
    const data = await checklistServices.listTemplates(type);
    res.status(StatusCode.OK).json({ success: true, message: 'Checklist templates fetched', data });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const addTemplate = async (req: Request, res: Response) => {
  try {
    const data = await checklistServices.createTemplate(req.body);
    res.status(StatusCode.CREATED).json({ success: true, message: 'Template added', data });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

export default { listForEmployee, startChecklist, addTask, completeTask, listTemplates, addTemplate };
