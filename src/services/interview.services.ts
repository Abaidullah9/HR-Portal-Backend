import Interview from "../models/interview.model";
import { AppError, MongoFilter } from "../utils/helper/AppError";
import { CreateInterviewDTO, UpdateInterviewDTO } from "../utils/dtos/interview.dto";
const addInterview = async (interviewData: CreateInterviewDTO) => {
  if (!interviewData.candidateId || !interviewData.interviewerId || !interviewData.scheduledAt || 
      !interviewData.mode || !interviewData.round) {
    throw new AppError("Missing required fields: candidateId, interviewerId, scheduledAt, mode, round", 400);
  }

  const interview = await Interview.create(interviewData);
  return interview;
};

const getInterviewById = async (interviewId: string) => {
  const interview = await Interview.findById(interviewId)
    .populate("candidateId", "name email")
    .populate("interviewerId", "name email");
  if (!interview) {
    throw new AppError("Interview not found", 404);
  }
  return interview;
};

const getInterviewsByCandidate = async (candidateId: string) => {
  const interviews = await Interview.find({ candidateId })
    .populate("interviewerId", "name email")
    .sort({ scheduledAt: 1 });
  return interviews;
};

const getInterviewsByInterviewer = async (interviewerId: string) => {
  const interviews = await Interview.find({ interviewerId })
    .populate("candidateId", "name email")
    .sort({ scheduledAt: 1 });
  return interviews;
};

const getInterviewsByStatus = async (status: string) => {
  const queryFilter: MongoFilter = { status };
  const interviews = await Interview.find(queryFilter)
    .populate("candidateId", "name email")
    .populate("interviewerId", "name email")
    .sort({ scheduledAt: 1 });
  return interviews;
};

const updateInterview = async (interviewId: string, updateData: UpdateInterviewDTO) => {
  const interview = await Interview.findByIdAndUpdate(interviewId, updateData, { new: true, runValidators: true })
    .populate("candidateId", "name email")
    .populate("interviewerId", "name email");
  if (!interview) {
    throw new AppError("Interview not found", 404);
  }
  return interview;
};

const updateInterviewStatus = async (interviewId: string, status: 'scheduled' | 'completed' | 'cancelled' | 'no-show') => {
  const interview = await Interview.findByIdAndUpdate(interviewId, { status }, { new: true })
    .populate("candidateId", "name email")
    .populate("interviewerId", "name email");
  if (!interview) {
    throw new AppError("Interview not found", 404);
  }
  return interview;
};

const deleteInterview = async (interviewId: string) => {
  const interview = await Interview.findByIdAndDelete(interviewId);
  if (!interview) {
    throw new AppError("Interview not found", 404);
  }
  return interview;
};

export default {
  addInterview,
  getInterviewById,
  getInterviewsByCandidate,
  getInterviewsByInterviewer,
  getInterviewsByStatus,
  updateInterview,
  updateInterviewStatus,
  deleteInterview,
};
