import { Request, Response } from 'express';
import hrInsightsServices from '../services/hrInsights.services';
import analyticsServices from '../services/analytics.services';
import { sendErrorResponse } from '../utils/helper/sendError';
import { recordAudit } from '../utils/helper/audit';
import { StatusCode } from '../utils/helper/constants/enum';
import { PaginationQuery } from '../utils/common';
import leaveRequestServices from '../services/leaveRequest.services';
import { resolveReadScope } from '../utils/helper/ownership';

const dashboardSummary = async (req: Request, res: Response) => {
  try {
    const data = await hrInsightsServices.dashboardSummary(req.userId!);
    res.status(StatusCode.OK).json({ success: true, message: 'Dashboard summary fetched', data });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const attendanceSummary = async (req: Request, res: Response) => {
  try {
    const date = typeof req.query.date === 'string' ? req.query.date : undefined;
    const data = await hrInsightsServices.attendanceSummary(date);
    res.status(StatusCode.OK).json({ success: true, message: 'Attendance summary fetched', data });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const payrollSummary = async (_req: Request, res: Response) => {
  try {
    const data = await hrInsightsServices.payrollSummary();
    res.status(StatusCode.OK).json({ success: true, message: 'Payroll summary fetched', data });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const generatePayroll = async (req: Request, res: Response) => {
  try {
    const { payPeriodStart, payPeriodEnd } = req.body as {
      payPeriodStart?: string;
      payPeriodEnd?: string;
    };
    const data = await hrInsightsServices.generatePayroll(
      payPeriodStart ?? '',
      payPeriodEnd ?? '',
      req.userId,
    );

    await recordAudit(req.userId, {
      action: 'payroll.generate',
      entity: 'EmployeePayroll',
      detail: `period ${payPeriodStart} → ${payPeriodEnd}: created ${data.created}, skipped ${data.skipped}`,
    }, res);

    res.status(StatusCode.CREATED).json({ success: true, message: 'Payroll period generated', data });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const ownBalances = async (req: Request, res: Response) => {
  try {
    const data = await hrInsightsServices.getOwnBalances(req.userId!);
    res.status(StatusCode.OK).json({ success: true, message: 'Leave balances fetched', data });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const ownAttendance = async (req: Request, res: Response) => {
  try {
    const { data, pagination } = await hrInsightsServices.getOwnAttendance(
      req.userId!,
      req.query as unknown as PaginationQuery,
    );
    res.status(StatusCode.OK).json({
      success: true,
      message: 'Attendance history fetched',
      data,
      pagination,
    });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const ownAppraisals = async (req: Request, res: Response) => {
  try {
    const data = await hrInsightsServices.getOwnAppraisals(req.userId!);
    res.status(StatusCode.OK).json({ success: true, message: 'Appraisals fetched', data });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const ownEmployee = async (req: Request, res: Response) => {
  try {
    const data = await hrInsightsServices.getOwnEmployee(req.userId!);
    res.status(StatusCode.OK).json({ success: true, message: 'Employee fetched', data });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

/** Who is in, out, on leave or on holiday for a day. */
const workforceToday = async (req: Request, res: Response) => {
  try {
    const date = typeof req.query.date === 'string' ? req.query.date : undefined;
    const data = await hrInsightsServices.workforceToday(date);
    res.status(StatusCode.OK).json({ success: true, message: 'Workforce summary fetched', data });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

/** Approved absence for the signed-in person's team, for the leave calendar. */
const teamCalendar = async (req: Request, res: Response) => {
  try {
    const from = typeof req.query.from === 'string' ? req.query.from : '';
    const to = typeof req.query.to === 'string' ? req.query.to : '';
    const scope = await resolveReadScope(req.userId!);
    const data = await leaveRequestServices.teamCalendar(scope, from, to);
    res.status(StatusCode.OK).json({ success: true, message: 'Team calendar fetched', data });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const listAuditLogs = async (req: Request, res: Response) => {
  try {
    const { data, pagination } = await hrInsightsServices.listAuditLogs(
      req.query as PaginationQuery & { entity?: string },
    );
    res.status(StatusCode.OK).json({ success: true, message: 'Audit log fetched', data, pagination });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const analyticsSummary = async (_req: Request, res: Response) => {
  try {
    const data = await analyticsServices.analyticsSummary();
    res.status(StatusCode.OK).json({ success: true, message: 'Analytics summary fetched', data });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

export default {
  analyticsSummary,
  dashboardSummary,
  attendanceSummary,
  payrollSummary,
  generatePayroll,
  ownBalances,
  ownEmployee,
  ownAttendance,
  ownAppraisals,
  workforceToday,
  teamCalendar,
  listAuditLogs,
};
