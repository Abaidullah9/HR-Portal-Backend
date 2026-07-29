import EmployeePayroll from "../models/employeePayroll.model";
import { AppError, MongoFilter } from "../utils/helper/AppError";
import { CreatePayrollDTO, UpdatePayrollDTO } from "../utils/dtos/employeePayroll.dto";
const addPayroll = async (payrollData: CreatePayrollDTO) => {
  if (!payrollData.employeeId || !payrollData.baseSalary || !payrollData.netPay || 
      !payrollData.payPeriodStart || !payrollData.payPeriodEnd || !payrollData.paymentMethod) {
    throw new AppError("Missing required fields: employeeId, baseSalary, netPay, payPeriodStart, payPeriodEnd, paymentMethod", 400);
  }

  // Check for duplicate pay period
  const existingPayroll = await EmployeePayroll.findOne({
    employeeId: payrollData.employeeId,
    payPeriodStart: payrollData.payPeriodStart,
  });
  if (existingPayroll) {
    throw new AppError("Payroll record already exists for this employee in this pay period", 409);
  }

  const payroll = await EmployeePayroll.create(payrollData);
  return payroll;
};

const getPayrollByEmployee = async (employeeId: string) => {
  const records = await EmployeePayroll.find({ employeeId })
    .sort({ payPeriodStart: -1 });
  return records;
};

const getPayrollById = async (payrollId: string) => {
  const payroll = await EmployeePayroll.findById(payrollId);
  if (!payroll) {
    throw new AppError("Payroll record not found", 404);
  }
  return payroll;
};

const getPayrollByPayPeriod = async (startDate: Date, endDate: Date) => {
  const records = await EmployeePayroll.find({
    payPeriodStart: { $gte: startDate },
    payPeriodEnd: { $lte: endDate },
  }).populate("employeeId", "name email employeeCode");
  return records;
};

const getPayrollByStatus = async (status: string) => {
  const queryFilter: MongoFilter = { status };
  const records = await EmployeePayroll.find(queryFilter)
    .populate("employeeId", "name email employeeCode");
  return records;
};

const updatePayroll = async (payrollId: string, updateData: UpdatePayrollDTO) => {
  const payroll = await EmployeePayroll.findByIdAndUpdate(payrollId, updateData, { new: true, runValidators: true });
  if (!payroll) {
    throw new AppError("Payroll record not found", 404);
  }
  return payroll;
};

const updatePayrollStatus = async (payrollId: string, status: 'pending' | 'completed' | 'failed') => {
  const payroll = await EmployeePayroll.findByIdAndUpdate(payrollId, { status }, { new: true });
  if (!payroll) {
    throw new AppError("Payroll record not found", 404);
  }
  return payroll;
};

const deletePayroll = async (payrollId: string) => {
  const payroll = await EmployeePayroll.findByIdAndDelete(payrollId);
  if (!payroll) {
    throw new AppError("Payroll record not found", 404);
  }
  return payroll;
};

export default {
  addPayroll,
  getPayrollByEmployee,
  getPayrollById,
  getPayrollByPayPeriod,
  getPayrollByStatus,
  updatePayroll,
  updatePayrollStatus,
  deletePayroll,
};
