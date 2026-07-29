import Candidate from "../models/candidate.model";
import { AppError, MongoFilter } from "../utils/helper/AppError";
import { CreateCandidateDTO, UpdateCandidateDTO } from "../utils/dtos/candidate.dto";
import { validateEmail } from "../utils/constants/validation.utils";
import { getPagination, paginatedResult, PaginationQuery } from "../utils/pagination";
const addCandidate = async (candidateData: CreateCandidateDTO) => {
  if (!candidateData.name || !candidateData.email || !candidateData.jobPostingId || !candidateData.source) {
    throw new AppError("Missing required fields: name, email, jobPostingId, source", 400);
  }

  const emailValidationError = validateEmail(candidateData.email);
  if (emailValidationError) {
    throw new AppError(emailValidationError, 400);
  }

  const candidate = await Candidate.create(candidateData);
  return candidate;
};

const getAllCandidate = async (query?: PaginationQuery) => {
  if (!query || (!query.page && !query.limit)) {
    const candidates = await Candidate.find().populate("jobPostingId", "position");
    return candidates;
  }
  const { page, limit, skip } = getPagination(query);
  const [candidates, total] = await Promise.all([
    Candidate.find().skip(skip).limit(limit).populate("jobPostingId", "position"),
    Candidate.countDocuments(),
  ]);
  return paginatedResult(candidates, total, page, limit);
};

const getCandidateById = async (candidateId: string) => {
  const candidate = await Candidate.findById(candidateId).populate("jobPostingId", "position");
  if (!candidate) {
    throw new AppError("Candidate not found", 404);
  }
  return candidate;
};

const getCandidatesByJobPosting = async (jobPostingId: string) => {
  const candidates = await Candidate.find({ jobPostingId }).sort({ appliedDate: -1 });
  return candidates;
};

const getCandidatesByStatus = async (status: string) => {
  const queryFilter: MongoFilter = { status };
  const candidates = await Candidate.find(queryFilter).populate("jobPostingId", "position");
  return candidates;
};

const updateCandidate = async (candidateId: string, updateData: UpdateCandidateDTO) => {
  if (updateData.email) {
    const emailValidationError = validateEmail(updateData.email);
    if (emailValidationError) {
      throw new AppError(emailValidationError, 400);
    }
  }

  const candidate = await Candidate.findByIdAndUpdate(candidateId, updateData, { new: true, runValidators: true });
  if (!candidate) {
    throw new AppError("Candidate not found", 404);
  }
  return candidate;
};

const updateCandidateStatus = async (candidateId: string, status: string) => {
  const validStatuses = ['applied', 'screening', 'interview', 'offered', 'hired', 'rejected'];
  if (!validStatuses.includes(status)) {
    throw new AppError("Invalid status", 400);
  }

  const candidate = await Candidate.findByIdAndUpdate(candidateId, { status }, { new: true });
  if (!candidate) {
    throw new AppError("Candidate not found", 404);
  }
  return candidate;
};

const deleteCandidate = async (candidateId: string) => {
  const candidate = await Candidate.findByIdAndDelete(candidateId);
  if (!candidate) {
    throw new AppError("Candidate not found", 404);
  }
  return candidate;
};

export default {
  addCandidate,
  getAllCandidate,
  getCandidateById,
  getCandidatesByJobPosting,
  getCandidatesByStatus,
  updateCandidate,
  updateCandidateStatus,
  deleteCandidate,
};
