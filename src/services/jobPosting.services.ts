import JobPosting from "../models/jobPosting.model";
import { AppError, MongoFilter } from "../utils/helper/AppError";
import { CreateJobPostingDTO, UpdateJobPostingDTO } from "../utils/dtos/jobPosting.dto";
import { getPagination, paginatedResult, PaginationQuery } from "../utils/pagination";
const addJobPosting = async (postingData: CreateJobPostingDTO) => {
  if (!postingData.position || !postingData.departmentId || !postingData.description || !postingData.postedBy) {
    throw new AppError("Missing required fields: position, departmentId, description, postedBy", 400);
  }

  const jobPosting = await JobPosting.create(postingData);
  return jobPosting;
};

const getAllJobPosting = async (query?: PaginationQuery) => {
  if (!query || (!query.page && !query.limit)) {
    const postings = await JobPosting.find()
      .populate("departmentId", "name")
      .populate("postedBy", "name email")
      .sort({ postedOnDate: -1 });
    return postings;
  }
  const { page, limit, skip } = getPagination(query);
  const [postings, total] = await Promise.all([
    JobPosting.find()
      .skip(skip).limit(limit)
      .populate("departmentId", "name")
      .populate("postedBy", "name email")
      .sort({ postedOnDate: -1 }),
    JobPosting.countDocuments(),
  ]);
  return paginatedResult(postings, total, page, limit);
};

const getJobPostingById = async (postingId: string) => {
  const posting = await JobPosting.findById(postingId)
    .populate("departmentId", "name")
    .populate("postedBy", "name email");
  if (!posting) {
    throw new AppError("Job posting not found", 404);
  }
  return posting;
};

const getJobPostingsByDepartment = async (departmentId: string) => {
  const postings = await JobPosting.find({ departmentId })
    .populate("postedBy", "name email")
    .sort({ postedOnDate: -1 });
  return postings;
};

const getJobPostingsByStatus = async (status: string) => {
  const queryFilter: MongoFilter = { status };
  const postings = await JobPosting.find(queryFilter)
    .populate("departmentId", "name")
    .populate("postedBy", "name email")
    .sort({ postedOnDate: -1 });
  return postings;
};

const updateJobPosting = async (postingId: string, updateData: UpdateJobPostingDTO) => {
  const posting = await JobPosting.findByIdAndUpdate(postingId, updateData, { new: true, runValidators: true })
    .populate("departmentId", "name")
    .populate("postedBy", "name email");
  if (!posting) {
    throw new AppError("Job posting not found", 404);
  }
  return posting;
};

const updateJobPostingStatus = async (postingId: string, status: 'open' | 'closed' | 'on-hold') => {
  const posting = await JobPosting.findByIdAndUpdate(postingId, { status }, { new: true })
    .populate("departmentId", "name")
    .populate("postedBy", "name email");
  if (!posting) {
    throw new AppError("Job posting not found", 404);
  }
  return posting;
};

const deleteJobPosting = async (postingId: string) => {
  const posting = await JobPosting.findByIdAndDelete(postingId);
  if (!posting) {
    throw new AppError("Job posting not found", 404);
  }
  return posting;
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
