import { Request, Response } from "express";
import catchAsync from "../utils/helper/catchAsync";
import interviewServices from "../services/interview.services";
import { MESSAGES } from "../utils/helper/constants/messages";
import { StatusCode } from "../utils/helper/constants/enum";

const addInterview = catchAsync(async (req: Request, res: Response) => {
  const result = await interviewServices.addInterview(req.body);
  res.status(StatusCode.CREATED).json({ success: true, message: MESSAGES.INTERVIEW_ADDED_SUCCESSFULLY, data: result });
});

const getInterviewById = catchAsync(async (req: Request, res: Response) => {
  const { _id } = req.params;
  const result = await interviewServices.getInterviewById(_id as string);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.INTERVIEW_FETCHED_SUCCESSFULLY, data: result });
});

const getInterviewByCandidate = catchAsync(async (req: Request, res: Response) => {
  const { candidateId } = req.params;
  const result = await interviewServices.getInterviewsByCandidate(candidateId as string);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.INTERVIEW_FETCHED_SUCCESSFULLY, data: result });
});

const getInterviewByInterviewer = catchAsync(async (req: Request, res: Response) => {
  const { interviewerId } = req.params;
  const result = await interviewServices.getInterviewsByInterviewer(interviewerId as string);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.INTERVIEW_FETCHED_SUCCESSFULLY, data: result });
});

const getInterviewByStatus = catchAsync(async (req: Request, res: Response) => {
  const { status } = req.params;
  const result = await interviewServices.getInterviewsByStatus(status as string);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.INTERVIEW_FETCHED_SUCCESSFULLY, data: result });
});

const updateInterview = catchAsync(async (req: Request, res: Response) => {
  const { _id } = req.params;
  const result = await interviewServices.updateInterview(_id as string, req.body);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.INTERVIEW_UPDATED_SUCCESSFULLY, data: result });
});

const updateInterviewStatus = catchAsync(async (req: Request, res: Response) => {
  const { _id } = req.params;
  const { status } = req.body;
  const result = await interviewServices.updateInterviewStatus(_id as string, status);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.INTERVIEW_UPDATED_SUCCESSFULLY, data: result });
});

const deleteInterview = catchAsync(async (req: Request, res: Response) => {
  const { _id } = req.params;
  await interviewServices.deleteInterview(_id as string);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.INTERVIEW_DELETED_SUCCESSFULLY, data: null });
});

export default {
  addInterview,
  getInterviewById,
  getInterviewByCandidate,
  getInterviewByInterviewer,
  getInterviewByStatus,
  updateInterview,
  updateInterviewStatus,
  deleteInterview,
};
