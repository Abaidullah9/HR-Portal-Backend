import { Request, Response } from "express";
import { sendErrorResponse } from "../utils/helper/sendError";
import jobPostingServices from "../services/jobPosting.services";
import { MESSAGES } from "../utils/helper/constants/messages";
import { StatusCode } from "../utils/helper/constants/enum";
import { AppError } from "../utils/helper/AppError";
import { CreateJobPostingDTO, UpdateJobPostingDTO } from "../utils/dtos/jobPosting.dto";
import { PaginationQuery } from "../utils/common";

const addJobPosting = async (req: Request, res: Response) => {
  try {
    // postedBy always comes from the authenticated user, never the client body
    const body: CreateJobPostingDTO = { ...req.body, postedBy: req.userId! };
    const newPosting = await jobPostingServices.addJobPosting(body);
    if (!newPosting) throw new AppError(MESSAGES.FAILED_TO_CREATE_JOB_POSTING, StatusCode.INTERNAL_SERVER_ERROR);
    res.status(StatusCode.CREATED).json({ success: true, message: MESSAGES.JOB_POSTING_ADDED_SUCCESSFULLY, data: newPosting });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const getAllJobPosting = async (req: Request, res: Response) => {
  try {
    const { data, pagination } = await jobPostingServices.getAllJobPosting(req.query as PaginationQuery);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.ALL_JOB_POSTINGS_FETCHED_SUCCESSFULLY, data, pagination });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const getJobPostingById = async (req: Request, res: Response) => {
  try {
    const { _id } = req.params;
    const result = await jobPostingServices.getJobPostingById(_id as string);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.JOB_POSTING_FETCHED_SUCCESSFULLY, data: result });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const getJobPostingByDepartment = async (req: Request, res: Response) => {
  try {
    const { departmentId } = req.params;
    const result = await jobPostingServices.getJobPostingsByDepartment(departmentId as string);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.ALL_JOB_POSTINGS_FETCHED_SUCCESSFULLY, data: result });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const getJobPostingByStatus = async (req: Request, res: Response) => {
  try {
    const { status } = req.params;
    const result = await jobPostingServices.getJobPostingsByStatus(status as string);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.ALL_JOB_POSTINGS_FETCHED_SUCCESSFULLY, data: result });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const updateJobPosting = async (req: Request, res: Response) => {
  try {
    const { _id } = req.params;
    const updateData: UpdateJobPostingDTO = req.body;
    const result = await jobPostingServices.updateJobPosting(_id as string, updateData);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.JOB_POSTING_UPDATED_SUCCESSFULLY, data: result });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const updateJobPostingStatus = async (req: Request, res: Response) => {
  try {
    const { _id } = req.params;
    const { status }: { status: string } = req.body;
    const result = await jobPostingServices.updateJobPostingStatus(_id as string, status as 'open' | 'closed' | 'on-hold');
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.JOB_POSTING_UPDATED_SUCCESSFULLY, data: result });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const deleteJobPosting = async (req: Request, res: Response) => {
  try {
    const { _id } = req.params;
    const deletedJobPosting = await jobPostingServices.deleteJobPosting(_id as string);
    if (!deletedJobPosting) throw new AppError(MESSAGES.JOB_POSTING_NOT_FOUND, StatusCode.NOT_FOUND);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.JOB_POSTING_DELETED_SUCCESSFULLY, data: deletedJobPosting });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

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
