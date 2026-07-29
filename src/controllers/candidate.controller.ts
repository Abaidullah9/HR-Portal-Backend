import { Request, Response } from "express";
import catchAsync from "../utils/helper/catchAsync";
import candidateServices from "../services/candidate.services";
import { MESSAGES } from "../utils/helper/constants/messages";
import { StatusCode } from "../utils/helper/constants/enum";

const addCandidate = catchAsync(async (req: Request, res: Response) => {
  const result = await candidateServices.addCandidate(req.body);
  res.status(StatusCode.CREATED).json({ success: true, message: MESSAGES.CANDIDATE_ADDED_SUCCESSFULLY, data: result });
});

const getAllCandidate = catchAsync(async (req: Request, res: Response) => {
  const result = await candidateServices.getAllCandidate();
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.ALL_CANDIDATES_FETCHED_SUCCESSFULLY, data: result });
});

const getCandidateById = catchAsync(async (req: Request, res: Response) => {
  const { _id } = req.params;
  const result = await candidateServices.getCandidateById(_id as string);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.CANDIDATE_FETCHED_SUCCESSFULLY, data: result });
});

const getCandidateByJobPosting = catchAsync(async (req: Request, res: Response) => {
  const { jobPostingId } = req.params;
  const result = await candidateServices.getCandidatesByJobPosting(jobPostingId as string);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.ALL_CANDIDATES_FETCHED_SUCCESSFULLY, data: result });
});

const getCandidateByStatus = catchAsync(async (req: Request, res: Response) => {
  const { status } = req.params;
  const result = await candidateServices.getCandidatesByStatus(status as string);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.ALL_CANDIDATES_FETCHED_SUCCESSFULLY, data: result });
});

const updateCandidate = catchAsync(async (req: Request, res: Response) => {
  const { _id } = req.params;
  const result = await candidateServices.updateCandidate(_id as string, req.body);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.CANDIDATE_UPDATED_SUCCESSFULLY, data: result });
});

const updateCandidateStatus = catchAsync(async (req: Request, res: Response) => {
  const { _id } = req.params;
  const { status } = req.body;
  const result = await candidateServices.updateCandidateStatus(_id as string, status);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.CANDIDATE_UPDATED_SUCCESSFULLY, data: result });
});

const deleteCandidate = catchAsync(async (req: Request, res: Response) => {
  const { _id } = req.params;
  await candidateServices.deleteCandidate(_id as string);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.CANDIDATE_DELETED_SUCCESSFULLY, data: null });
});

export default {
  addCandidate,
  getAllCandidate,
  getCandidateById,
  getCandidateByJobPosting,
  getCandidateByStatus,
  updateCandidate,
  updateCandidateStatus,
  deleteCandidate,
};
