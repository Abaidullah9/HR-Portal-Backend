import { Request, Response } from "express";
import { sendErrorResponse } from "../utils/helper/sendError";
import interviewServices from "../services/interview.services";
import { MESSAGES } from "../utils/helper/constants/messages";
import { StatusCode } from "../utils/helper/constants/enum";
import { AppError } from "../utils/helper/AppError";
import { CreateInterviewDTO, UpdateInterviewDTO } from "../utils/dtos/interview.dto";
import { PaginationQuery } from "../utils/common";

const addInterview = async (req: Request, res: Response) => {
  try {
    const body: CreateInterviewDTO = req.body;
    const newInterview = await interviewServices.addInterview(body);
    if (!newInterview) throw new AppError(MESSAGES.FAILED_TO_CREATE_INTERVIEW, StatusCode.INTERNAL_SERVER_ERROR);
    res.status(StatusCode.CREATED).json({ success: true, message: MESSAGES.INTERVIEW_ADDED_SUCCESSFULLY, data: newInterview });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const getAllInterview = async (req: Request, res: Response) => {
  try {
    const { data, pagination } = await interviewServices.getAllInterview(req.query as PaginationQuery);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.ALL_INTERVIEWS_FETCHED_SUCCESSFULLY, data, pagination });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const getInterviewById = async (req: Request, res: Response) => {
  try {
    const { _id } = req.params;
    const result = await interviewServices.getInterviewById(_id as string);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.INTERVIEW_FETCHED_SUCCESSFULLY, data: result });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const getInterviewByCandidate = async (req: Request, res: Response) => {
  try {
    const { candidateId } = req.params;
    const result = await interviewServices.getInterviewsByCandidate(candidateId as string);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.INTERVIEW_FETCHED_SUCCESSFULLY, data: result });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const getInterviewByInterviewer = async (req: Request, res: Response) => {
  try {
    const { interviewerId } = req.params;
    const result = await interviewServices.getInterviewsByInterviewer(interviewerId as string);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.INTERVIEW_FETCHED_SUCCESSFULLY, data: result });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const getInterviewByStatus = async (req: Request, res: Response) => {
  try {
    const { status } = req.params;
    const result = await interviewServices.getInterviewsByStatus(status as string);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.INTERVIEW_FETCHED_SUCCESSFULLY, data: result });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const updateInterview = async (req: Request, res: Response) => {
  try {
    const { _id } = req.params;
    const updateData: UpdateInterviewDTO = req.body;
    const result = await interviewServices.updateInterview(_id as string, updateData);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.INTERVIEW_UPDATED_SUCCESSFULLY, data: result });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const updateInterviewStatus = async (req: Request, res: Response) => {
  try {
    const { _id } = req.params;
    const { status }: { status: string } = req.body;
    const result = await interviewServices.updateInterviewStatus(_id as string, status as 'scheduled' | 'completed' | 'cancelled' | 'no-show');
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.INTERVIEW_UPDATED_SUCCESSFULLY, data: result });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const deleteInterview = async (req: Request, res: Response) => {
  try {
    const { _id } = req.params;
    const deletedInterview = await interviewServices.deleteInterview(_id as string);
    if (!deletedInterview) throw new AppError(MESSAGES.INTERVIEW_NOT_FOUND, StatusCode.NOT_FOUND);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.INTERVIEW_DELETED_SUCCESSFULLY, data: deletedInterview });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

export default {
  addInterview,
  getAllInterview,
  getInterviewById,
  getInterviewByCandidate,
  getInterviewByInterviewer,
  getInterviewByStatus,
  updateInterview,
  updateInterviewStatus,
  deleteInterview,
};
