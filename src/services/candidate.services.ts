import { StatusCode } from "../utils/helper/constants/enum";
import { AppError } from "../utils/helper/AppError";
import candidateModel from "../models/candidate.model";
import { CreateCandidateDTO } from "../utils/dtos/candidate.dto";
import { MESSAGES } from "../utils/helper/constants/messages";
import { getPagination, paginatedResult, PaginationQuery } from "../utils/common";

const addCandidate = async (candidateData: CreateCandidateDTO) => {
  if (!candidateData) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const newCandidate = await candidateModel.create(candidateData);
  return newCandidate;
};

const getAllCandidate = async (query: PaginationQuery) => {
  const { page, limit, skip } = getPagination(query);
  const allCandidates = await candidateModel.find().populate("jobPostingId", "position").skip(skip).limit(limit);
  const total = await candidateModel.countDocuments();
  return paginatedResult(allCandidates, total, page, limit);
};

const getCandidateById = async (_id: string) => {
  if (!_id) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const candidateById = await candidateModel.findById(_id).populate("jobPostingId", "position");
  if (!candidateById) throw new AppError(MESSAGES.CANDIDATE_NOT_FOUND, StatusCode.NOT_FOUND);
  return candidateById;
};

const getCandidatesByJobPosting = async (jobPostingId: string) => {
  if (!jobPostingId) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const candidates = await candidateModel.find({ jobPostingId }).sort({ appliedDate: -1 });
  if (!candidates) throw new AppError(MESSAGES.CANDIDATE_NOT_FOUND, StatusCode.NOT_FOUND);
  return candidates;
};

const getCandidatesByStatus = async (status: string) => {
  if (!status) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const filter: Record<string, unknown> = { status };
  const candidates = await candidateModel.find(filter).populate("jobPostingId", "position");
  if (!candidates) throw new AppError(MESSAGES.CANDIDATE_NOT_FOUND, StatusCode.NOT_FOUND);
  return candidates; 
};

const updateCandidate = async (_id: string, updateData: Partial<CreateCandidateDTO>) => {
  if (!_id) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const updatedCandidate = await candidateModel.findByIdAndUpdate(_id, updateData, { returnDocument: 'after' });
  if (!updatedCandidate) throw new AppError(MESSAGES.CANDIDATE_NOT_FOUND, StatusCode.NOT_FOUND);

  return updatedCandidate;
};

const updateCandidateStatus = async (_id: string, status: string) => {
  if (!_id || !status) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const updateFilter: Record<string, unknown> = { status };
  const updatedCandidate = await candidateModel.findByIdAndUpdate(_id, updateFilter, { returnDocument: 'after' });
  if (!updatedCandidate) throw new AppError(MESSAGES.CANDIDATE_NOT_FOUND, StatusCode.NOT_FOUND);

  return updatedCandidate;
};

const deleteCandidate = async (_id: string) => {
  if (!_id) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const deletedCandidate = await candidateModel.findByIdAndDelete(_id);

  return deletedCandidate;
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
