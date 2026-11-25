import { Request, Response } from "express";
import { sendErrorResponse } from "../utils/helper/sendError";
import employeePayrollServices from "../services/employeePayroll.services";
import { MESSAGES } from "../utils/helper/constants/messages";
import { StatusCode } from "../utils/helper/constants/enum";
import { AppError } from "../utils/helper/AppError";
import { CreatePayrollDTO, UpdatePayrollDTO } from "../utils/dtos/employeePayroll.dto";
import { PaginationQuery } from "../utils/common";
import { recordAudit } from "../utils/helper/audit";
import { resolveReadScope } from "../utils/helper/ownership";
import { buildPayslipPdf } from "../utils/payslip-pdf";

const addPayroll = async (req: Request, res: Response) => {
  try {
    const body: CreatePayrollDTO = req.body;
    const newPayroll = await employeePayrollServices.addPayroll(body);
    if (!newPayroll) throw new AppError(MESSAGES.FAILED_TO_CREATE_PAYROLL, StatusCode.INTERNAL_SERVER_ERROR);
    res.status(StatusCode.CREATED).json({ success: true, message: MESSAGES.PAYROLL_ADDED_SUCCESSFULLY, data: newPayroll });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const getAllPayroll = async (req: Request, res: Response) => {
  try {
    const scope = await resolveReadScope(req.userId!);
    const { data, pagination } = await employeePayrollServices.getAllPayroll(req.query as PaginationQuery, scope);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.ALL_PAYROLL_FETCHED_SUCCESSFULLY, data, pagination });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const getPayrollById = async (req: Request, res: Response) => {
  try {
    const { _id } = req.params;
    const scope = await resolveReadScope(req.userId!);
    const result = await employeePayrollServices.getPayrollById(_id as string, scope);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.PAYROLL_FETCHED_SUCCESSFULLY, data: result });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const getPayrollByEmployee = async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const scope = await resolveReadScope(req.userId!);
    const result = await employeePayrollServices.getPayrollByEmployee(employeeId as string, scope);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.PAYROLL_FETCHED_SUCCESSFULLY, data: result });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const getPayrollByPayPeriod = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate }: { startDate?: string; endDate?: string } = req.query;
  
    if (!startDate || !endDate) {
      throw new AppError(MESSAGES.DATE_RANGE_REQUIRED, StatusCode.BAD_REQUEST);
    }
  
    const parsedStart = new Date(startDate);
    const parsedEnd = new Date(endDate);
  
    if (isNaN(parsedStart.getTime()) || isNaN(parsedEnd.getTime())) {
      throw new AppError(MESSAGES.INVALID_DATE_FORMAT, StatusCode.BAD_REQUEST);
    }
  
    const result = await employeePayrollServices.getPayrollByPayPeriod(
      parsedStart,
      parsedEnd
    );
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.PAYROLL_FETCHED_SUCCESSFULLY, data: result });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const getPayrollByStatus = async (req: Request, res: Response) => {
  try {
    const { status } = req.params;
    const result = await employeePayrollServices.getPayrollByStatus(status as string);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.PAYROLL_FETCHED_SUCCESSFULLY, data: result });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const updatePayroll = async (req: Request, res: Response) => {
  try {
    const { _id } = req.params;
    const updateData: UpdatePayrollDTO = req.body;
    const result = await employeePayrollServices.updatePayroll(_id as string, updateData);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.PAYROLL_UPDATED_SUCCESSFULLY, data: result });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const updatePayrollStatus = async (req: Request, res: Response) => {
  try {
    const { _id } = req.params;
    const { status }: { status: string } = req.body;
    const result = await employeePayrollServices.updatePayrollStatus(_id as string, status as 'completed' | 'failed' | 'pending');
    await recordAudit(req.userId, {
      action: `payroll.${status}`,
      entity: 'EmployeePayroll',
      entityId: _id as string,
    }, res);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.PAYROLL_UPDATED_SUCCESSFULLY, data: result });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const deletePayroll = async (req: Request, res: Response) => {
  try {
    const { _id } = req.params;
    const deletedPayroll = await employeePayrollServices.deletePayroll(_id as string);
    if (!deletedPayroll) throw new AppError(MESSAGES.PAYROLL_NOT_FOUND, StatusCode.NOT_FOUND);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.PAYROLL_DELETED_SUCCESSFULLY, data: deletedPayroll });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const getPayslip = async (req: Request, res: Response) => {
  try {
    const scope = await resolveReadScope(req.userId!);
    const data = await employeePayrollServices.getPayslip(req.params._id as string, scope);
    res.status(StatusCode.OK).json({ success: true, message: "Payslip fetched", data });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

/** Streams the payslip as a PDF; the scope check is the one the JSON view uses. */
const downloadPayslip = async (req: Request, res: Response) => {
  try {
    const scope = await resolveReadScope(req.userId!);
    const payslip = await employeePayrollServices.getPayslip(req.params._id as string, scope);
    const pdf = await buildPayslipPdf(payslip);

    const slug = payslip.employee.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const period = new Date(payslip.periodStart).toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="payslip-${slug}-${period}.pdf"`);
    res.setHeader('Content-Length', String(pdf.length));
    res.send(pdf);
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const getOwnPayslips = async (req: Request, res: Response) => {
  try {
    const data = await employeePayrollServices.getOwnPayslips(req.userId!);
    res.status(StatusCode.OK).json({ success: true, message: "Payslips fetched", data });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

export default {
  getPayslip,
  downloadPayslip,
  getOwnPayslips,
  addPayroll,
  getAllPayroll,
  getPayrollById,
  getPayrollByEmployee,
  getPayrollByPayPeriod,
  getPayrollByStatus,
  updatePayroll,
  updatePayrollStatus,
  deletePayroll,
};
