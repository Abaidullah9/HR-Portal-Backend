import { StatusCode } from "../utils/helper/constants/enum";
import { AppError } from "../utils/helper/AppError";
import jobPostingModel from "../models/jobPosting.model";
import { CreateJobPostingDTO } from "../utils/dtos/jobPosting.dto";
import { MESSAGES } from "../utils/helper/constants/messages";
import { getPagination, paginatedResult, PaginationQuery } from "../utils/common";

const addJobPosting = async (postingData: CreateJobPostingDTO) => {
  if (!postingData) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const newPosting = await jobPostingModel.create(postingData);
  return newPosting;
};

const getAllJobPosting = async (query: PaginationQuery) => {
  const { page, limit, skip } = getPagination(query);
  const allPostings = await jobPostingModel.find()
    .populate("departmentId", "name")
    .populate("postedBy", "name email")
    .sort({ postedOnDate: -1 })
    .skip(skip)
    .limit(limit);
  const total = await jobPostingModel.countDocuments();
  return paginatedResult(allPostings, total, page, limit);
};

const getJobPostingById = async (_id: string) => {
  if (!_id) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const postingById = await jobPostingModel.findById(_id)
    .populate("departmentId", "name")
    .populate("postedBy", "name email");
  if (!postingById) throw new AppError(MESSAGES.JOB_POSTING_NOT_FOUND, StatusCode.NOT_FOUND);
  return postingById;
};

const getJobPostingsByDepartment = async (departmentId: string) => {
  if (!departmentId) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const postings = await jobPostingModel.find({ departmentId })
    .populate("postedBy", "name email")
    .sort({ postedOnDate: -1 });
    if (!postings) throw new AppError(MESSAGES.JOB_POSTING_NOT_FOUND, StatusCode.NOT_FOUND);
  return postings;
};

const getJobPostingsByStatus = async (status: string) => {
  if (!status) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const filter: Record<string, unknown> = { status : status };
  const postings = await jobPostingModel.find(filter)
    .populate("departmentId", "name")
    .populate("postedBy", "name email")
    .sort({ postedOnDate: -1 });
    if (!postings) throw new AppError(MESSAGES.JOB_POSTING_NOT_FOUND, StatusCode.NOT_FOUND);
  return postings;
};

const updateJobPosting = async (_id: string, updateData: Partial<CreateJobPostingDTO>) => {
  if (!_id) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const updatedPosting = await jobPostingModel.findByIdAndUpdate(_id, updateData, { returnDocument: 'after' })
    .populate("departmentId", "name")
    .populate("postedBy", "name email");
  if (!updatedPosting) throw new AppError(MESSAGES.JOB_POSTING_NOT_FOUND, StatusCode.NOT_FOUND);

  return updatedPosting;
};

const updateJobPostingStatus = async (_id: string, status: string) => {
  if (!_id || !status) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const updateFilter: Record<string, unknown> = { status };
  const updatedPosting = await jobPostingModel.findByIdAndUpdate(_id, updateFilter, { returnDocument: 'after' })
    .populate("departmentId", "name")
    .populate("postedBy", "name email");
  if (!updatedPosting) throw new AppError(MESSAGES.JOB_POSTING_NOT_FOUND, StatusCode.NOT_FOUND);

  return updatedPosting;
};

const deleteJobPosting = async (_id: string) => {
  if (!_id) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const deletedPosting = await jobPostingModel.findByIdAndDelete(_id);

  return deletedPosting;
};

export default {
  addJobPosting,
  getAllJobPosting,
  getJobPostingById,
  getJobPostingsByDepartment,
  getJobPostingsByStatus,
  updateJobPosting,
  updateJobPostingStatus,
  deleteJobPosting,
};
