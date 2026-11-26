import { Request, Response } from 'express';
import { sendErrorResponse } from '../utils/helper/sendError';
import payrollRunServices from '../services/payrollRun.services';
import { StatusCode } from '../utils/helper/constants/enum';
import { PaginationQuery } from '../utils/common';

const listRuns = async (req: Request, res: Response) => {
  try {
    const { data, pagination } = await payrollRunServices.listRuns(
      req.query as PaginationQuery & { status?: string },
    );
    res.status(StatusCode.OK).json({ success: true, message: 'Payroll runs fetched', data, pagination });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const generateRun = async (req: Request, res: Response) => {
  try {
    // The header wins so a retrying client does not have to mutate the body.
    const idempotencyKey = req.get('Idempotency-Key') ?? (req.body as { idempotencyKey?: string })?.idempotencyKey;
    const data = await payrollRunServices.generateRun(
      { ...req.body, ...(idempotencyKey ? { idempotencyKey } : {}) },
      req.userId,
    );
    res.status(data.replayed ? StatusCode.OK : StatusCode.CREATED).json({
      success: true,
      message: data.replayed ? 'Payroll run already exists for that request' : 'Payroll draft created',
      data,
    });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const getRun = async (req: Request, res: Response) => {
  try {
    const data = await payrollRunServices.getRun(req.params._id as string);
    res.status(StatusCode.OK).json({ success: true, message: 'Payroll run fetched', data });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const approveRun = async (req: Request, res: Response) => {
  try {
    const data = await payrollRunServices.approveRun(req.params._id as string, req.userId);
    res.status(StatusCode.OK).json({ success: true, message: 'Payroll run approved', data });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const markPaid = async (req: Request, res: Response) => {
  try {
    const data = await payrollRunServices.markRunPaid(req.params._id as string);
    res.status(StatusCode.OK).json({ success: true, message: 'Payroll run marked paid', data });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const reverseRun = async (req: Request, res: Response) => {
  try {
    const { reason } = req.body as { reason?: string };
    const data = await payrollRunServices.reverseRun(req.params._id as string, reason ?? '');
    res.status(StatusCode.OK).json({ success: true, message: 'Payroll run reversed', data });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const exportRun = async (req: Request, res: Response) => {
  try {
    const { filename, csv } = await payrollRunServices.runCsv(req.params._id as string);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

export default { listRuns, generateRun, getRun, approveRun, markPaid, reverseRun, exportRun };
