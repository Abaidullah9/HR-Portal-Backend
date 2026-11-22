import { Request, Response } from "express";
import { sendErrorResponse } from "../utils/helper/sendError";
import candidateServices from "../services/candidate.services";
import { MESSAGES } from "../utils/helper/constants/messages";
import { StatusCode } from "../utils/helper/constants/enum";
import { AppError } from "../utils/helper/AppError";
import { CreateCandidateDTO, UpdateCandidateDTO } from "../utils/dtos/candidate.dto";
import { PaginationQuery } from "../utils/common";
import hireServices from "../services/hire.services";

const addCandidate = async (req: Request, res: Response) => {
  try {
    const body: CreateCandidateDTO = req.body;
    const newCandidate = await candidateServices.addCandidate(body);
    if (!newCandidate) throw new AppError(MESSAGES.FAILED_TO_CREATE_CANDIDATE, StatusCode.INTERNAL_SERVER_ERROR);
    res.status(StatusCode.CREATED).json({ success: true, message: MESSAGES.CANDIDATE_ADDED_SUCCESSFULLY, data: newCandidate });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const getAllCandidate = async (req: Request, res: Response) => {
  try {
    const { data, pagination } = await candidateServices.getAllCandidate(req.query as PaginationQuery);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.ALL_CANDIDATES_FETCHED_SUCCESSFULLY, data, pagination });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const getCandidateById = async (req: Request, res: Response) => {
  try {
    const { _id } = req.params;
    const result = await candidateServices.getCandidateById(_id as string);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.CANDIDATE_FETCHED_SUCCESSFULLY, data: result });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const getCandidateByJobPosting = async (req: Request, res: Response) => {
  try {
    const { jobPostingId } = req.params;
    const result = await candidateServices.getCandidatesByJobPosting(jobPostingId as string);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.ALL_CANDIDATES_FETCHED_SUCCESSFULLY, data: result });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const getCandidateByStatus = async (req: Request, res: Response) => {
  try {
    const { status } = req.params;
    const result = await candidateServices.getCandidatesByStatus(status as string);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.ALL_CANDIDATES_FETCHED_SUCCESSFULLY, data: result });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const updateCandidate = async (req: Request, res: Response) => {
  try {
    const { _id } = req.params;
    const updateData: UpdateCandidateDTO = req.body;
    const result = await candidateServices.updateCandidate(_id as string, updateData);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.CANDIDATE_UPDATED_SUCCESSFULLY, data: result });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const updateCandidateStatus = async (req: Request, res: Response) => {
  try {
    const { _id } = req.params;
    const { status }: { status: string } = req.body;
    const result = await candidateServices.updateCandidateStatus(_id as string, status as 'applied' | 'screening' | 'interview' | 'offered' | 'hired' | 'rejected');
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.CANDIDATE_UPDATED_SUCCESSFULLY, data: result });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

/** Converts a hired candidate into a User invite plus an Employee record. */
const hireCandidate = async (req: Request, res: Response) => {
  try {
    const data = await hireServices.hireCandidate(req.params._id as string, req.body);
    res.status(StatusCode.CREATED).json({ success: true, message: 'Candidate hired', data });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const deleteCandidate = async (req: Request, res: Response) => {
  try {
    const { _id } = req.params;
    const deletedCandidate = await candidateServices.deleteCandidate(_id as string);
    if (!deletedCandidate) throw new AppError(MESSAGES.CANDIDATE_NOT_FOUND, StatusCode.NOT_FOUND);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.CANDIDATE_DELETED_SUCCESSFULLY, data: deletedCandidate });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

export default {
  addCandidate,
  getAllCandidate,
  getCandidateById,
  getCandidateByJobPosting,
  getCandidateByStatus,
  updateCandidate,
  updateCandidateStatus,
  hireCandidate,
  deleteCandidate,
};
