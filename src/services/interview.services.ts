import { StatusCode } from "../utils/helper/constants/enum";
import { AppError } from "../utils/helper/AppError";
import interviewModel from "../models/interview.model";
import { CreateInterviewDTO } from "../utils/dtos/interview.dto";
import { MESSAGES } from "../utils/helper/constants/messages";
import { getPagination, paginatedResult, PaginationQuery } from "../utils/common";
const addInterview = async (interviewData: CreateInterviewDTO) => {
  if (!interviewData) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const newInterview = await interviewModel.create(interviewData);
  return newInterview;
};
const getAllInterview = async (query: PaginationQuery) => {
  const { page, limit, skip } = getPagination(query);
  const allInterviews = await interviewModel.find().populate("candidateId", "name email phone status").populate("interviewerId", "name email employeeCode").skip(skip).limit(limit);
  const total = await interviewModel.countDocuments();
  return paginatedResult(allInterviews, total, page, limit);
}
const getInterviewById = async (_id: string) => {
  if (!_id) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const interviewById = await interviewModel.findById(_id).populate("candidateId", "name email phone status").populate("interviewerId", "name email employeeCode");
  if (!interviewById) throw new AppError(MESSAGES.INTERVIEW_NOT_FOUND, StatusCode.NOT_FOUND);
  return interviewById;
};

const getInterviewsByCandidate = async (candidateId: string) => {
  if (!candidateId) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const interviews = await interviewModel.find({ candidateId }).populate("candidateId", "name email phone status").populate("interviewerId", "name email employeeCode");
  if (!interviews) throw new AppError(MESSAGES.INTERVIEW_NOT_FOUND, StatusCode.NOT_FOUND);
  return interviews;
};

const getInterviewsByInterviewer = async (interviewerId: string) => {
  if (!interviewerId) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const interviews = await interviewModel.find({ interviewerId }).populate("candidateId", "name email phone status").populate("interviewerId", "name email employeeCode");
  if (!interviews) throw new AppError(MESSAGES.INTERVIEW_NOT_FOUND, StatusCode.NOT_FOUND);
  return interviews;
};

const getInterviewsByStatus = async (status: string) => {
  if (!status) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const filter: Record<string, unknown> = { status };
  const interviews = await interviewModel.find(filter).populate("candidateId", "name email phone status").populate("interviewerId", "name email employeeCode");
  if (!interviews) throw new AppError(MESSAGES.INTERVIEW_NOT_FOUND, StatusCode.NOT_FOUND);
  return interviews;
};

const updateInterview = async (_id: string, updateData: Partial<CreateInterviewDTO>) => {
  if (!_id) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const updatedInterview = await interviewModel.findByIdAndUpdate(_id, updateData, { returnDocument: 'after' }).populate("candidateId", "name email phone status").populate("interviewerId", "name email employeeCode");
  if (!updatedInterview) throw new AppError(MESSAGES.INTERVIEW_NOT_FOUND, StatusCode.NOT_FOUND);

  return updatedInterview;
};

const updateInterviewStatus = async (_id: string, status: string) => {
  if (!_id || !status) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const updateFilter: Record<string, unknown> = { status };
  const updatedInterview = await interviewModel.findByIdAndUpdate(_id, updateFilter, { returnDocument: 'after' }).populate("candidateId", "name email phone status").populate("interviewerId", "name email employeeCode");
  if (!updatedInterview) throw new AppError(MESSAGES.INTERVIEW_NOT_FOUND, StatusCode.NOT_FOUND);

  return updatedInterview;
};

const deleteInterview = async (_id: string) => {
  if (!_id) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const deletedInterview = await interviewModel.findByIdAndDelete(_id);

  return deletedInterview;
};

export default {
  addInterview,
  getAllInterview,
  getInterviewById,
  getInterviewsByCandidate,
  getInterviewsByInterviewer,
  getInterviewsByStatus,
  updateInterview,
  updateInterviewStatus,
  deleteInterview,
};
