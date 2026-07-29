import { Request, Response } from "express";
import catchAsync from "../utils/helper/catchAsync";
import jobPostingServices from "../services/jobPosting.services";
import { MESSAGES } from "../utils/helper/constants/messages";
import { StatusCode } from "../utils/helper/constants/enum";

const addJobPosting = catchAsync(async (req: Request, res: Response) => {
  const result = await jobPostingServices.addJobPosting(req.body);
  res.status(StatusCode.CREATED).json({ success: true, message: MESSAGES.JOB_POSTING_ADDED_SUCCESSFULLY, data: result });
});

const getAllJobPosting = catchAsync(async (req: Request, res: Response) => {
  const result = await jobPostingServices.getAllJobPosting(req.query as any);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.ALL_JOB_POSTINGS_FETCHED_SUCCESSFULLY, data: result });
});

const getJobPostingById = catchAsync(async (req: Request, res: Response) => {
  const { _id } = req.params;
  const result = await jobPostingServices.getJobPostingById(_id as string);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.JOB_POSTING_FETCHED_SUCCESSFULLY, data: result });
});

const getJobPostingByDepartment = catchAsync(async (req: Request, res: Response) => {
  const { departmentId } = req.params;
  const result = await jobPostingServices.getJobPostingsByDepartment(departmentId as string);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.ALL_JOB_POSTINGS_FETCHED_SUCCESSFULLY, data: result });
});

const getJobPostingByStatus = catchAsync(async (req: Request, res: Response) => {
  const { status } = req.params;
  const result = await jobPostingServices.getJobPostingsByStatus(status as string);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.ALL_JOB_POSTINGS_FETCHED_SUCCESSFULLY, data: result });
});

const updateJobPosting = catchAsync(async (req: Request, res: Response) => {
  const { _id } = req.params;
  const result = await jobPostingServices.updateJobPosting(_id as string, req.body);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.JOB_POSTING_UPDATED_SUCCESSFULLY, data: result });
});

const updateJobPostingStatus = catchAsync(async (req: Request, res: Response) => {
  const { _id } = req.params;
  const { status } = req.body;
  const result = await jobPostingServices.updateJobPostingStatus(_id as string, status);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.JOB_POSTING_UPDATED_SUCCESSFULLY, data: result });
});

const deleteJobPosting = catchAsync(async (req: Request, res: Response) => {
  const { _id } = req.params;
  await jobPostingServices.deleteJobPosting(_id as string);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.JOB_POSTING_DELETED_SUCCESSFULLY, data: null });
});

export default {
  addJobPosting,
  getAllJobPosting,
  getJobPostingById,
  getJobPostingByDepartment,
  getJobPostingByStatus,
  updateJobPosting,
  updateJobPostingStatus,
  deleteJobPosting,
};
