import { Request, Response } from "express";
import catchAsync from "../utils/helper/catchAsync";
import employeePayrollServices from "../services/employeePayroll.services";
import { MESSAGES } from "../utils/helper/constants/messages";
import { StatusCode } from "../utils/helper/constants/enum";

const addPayroll = catchAsync(async (req: Request, res: Response) => {
  const result = await employeePayrollServices.addPayroll(req.body);
  res.status(StatusCode.CREATED).json({ success: true, message: MESSAGES.PAYROLL_ADDED_SUCCESSFULLY, data: result });
});

const getPayrollById = catchAsync(async (req: Request, res: Response) => {
  const { _id } = req.params;
  const result = await employeePayrollServices.getPayrollById(_id as string);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.PAYROLL_FETCHED_SUCCESSFULLY, data: result });
});

const getPayrollByEmployee = catchAsync(async (req: Request, res: Response) => {
  const { employeeId } = req.params;
  const result = await employeePayrollServices.getPayrollByEmployee(employeeId as string);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.PAYROLL_FETCHED_SUCCESSFULLY, data: result });
});

const getPayrollByPayPeriod = catchAsync(async (req: Request, res: Response) => {
  const { startDate, endDate } = req.query;
  const result = await employeePayrollServices.getPayrollByPayPeriod(
    new Date(startDate as string),
    new Date(endDate as string)
  );
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.PAYROLL_FETCHED_SUCCESSFULLY, data: result });
});

const getPayrollByStatus = catchAsync(async (req: Request, res: Response) => {
  const { status } = req.params;
  const result = await employeePayrollServices.getPayrollByStatus(status as string);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.PAYROLL_FETCHED_SUCCESSFULLY, data: result });
});

const updatePayroll = catchAsync(async (req: Request, res: Response) => {
  const { _id } = req.params;
  const result = await employeePayrollServices.updatePayroll(_id as string, req.body);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.PAYROLL_UPDATED_SUCCESSFULLY, data: result });
});

const updatePayrollStatus = catchAsync(async (req: Request, res: Response) => {
  const { _id } = req.params;
  const { status } = req.body;
  const result = await employeePayrollServices.updatePayrollStatus(_id as string, status);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.PAYROLL_UPDATED_SUCCESSFULLY, data: result });
});

const deletePayroll = catchAsync(async (req: Request, res: Response) => {
  const { _id } = req.params;
  await employeePayrollServices.deletePayroll(_id as string);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.PAYROLL_DELETED_SUCCESSFULLY, data: null });
});

export default {
  addPayroll,
  getPayrollById,
  getPayrollByEmployee,
  getPayrollByPayPeriod,
  getPayrollByStatus,
  updatePayroll,
  updatePayrollStatus,
  deletePayroll,
};
