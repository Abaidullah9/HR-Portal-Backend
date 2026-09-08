import { Request, Response } from "express";
import { sendErrorResponse } from "../utils/helper/sendError";
import teamServices from "../services/team.services";
import { MESSAGES } from "../utils/helper/constants/messages";
import { StatusCode } from "../utils/helper/constants/enum";
import { AppError } from "../utils/helper/AppError";
import { CreateTeamDTO, UpdateTeamDTO } from "../utils/dtos/team.dto";
import { PaginationQuery } from "../utils/common";

const addTeam = async (req: Request, res: Response) => {
  try {
    const body: CreateTeamDTO = req.body;
    const newTeam = await teamServices.addTeam(body);
    if (!newTeam) throw new AppError(MESSAGES.FAILED_TO_CREATE_TEAM, StatusCode.INTERNAL_SERVER_ERROR);
    res.status(StatusCode.CREATED).json({ success: true, message: MESSAGES.TEAM_ADDED_SUCCESSFULLY, data: newTeam });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const getAllTeam = async (req: Request, res: Response) => {
  try {
    const { data, pagination } = await teamServices.getAllTeam(req.query as PaginationQuery);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.ALL_TEAMS_FETCHED_SUCCESSFULLY, data, pagination });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const getTeamById = async (req: Request, res: Response) => {
  try {
    const { _id } = req.params;
    const result = await teamServices.getTeamById(_id as string);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.TEAM_FETCHED_SUCCESSFULLY, data: result });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const updateTeam = async (req: Request, res: Response) => {
  try {
    const { _id } = req.params;
    const updateData: UpdateTeamDTO = req.body;
    const result = await teamServices.updateTeam(_id as string, updateData);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.TEAM_UPDATED_SUCCESSFULLY, data: result });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const addTeamMember = async (req: Request, res: Response) => {
  try {
    const { _id } = req.params;
    const { employeeId }: { employeeId: string } = req.body;
    const result = await teamServices.addTeamMember(_id as string, employeeId);
    res.status(StatusCode.CREATED).json({ success: true, message: MESSAGES.MEMBER_ADDED_SUCCESSFULLY, data: result });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const removeTeamMember = async (req: Request, res: Response) => {
  try {
    const { _id, employeeId } = req.params;
    const result = await teamServices.removeTeamMember(_id as string, employeeId as string);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.MEMBER_REMOVED_SUCCESSFULLY, data: result });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const deleteTeam = async (req: Request, res: Response) => {
  try {
    const { _id } = req.params;
    const deletedTeam = await teamServices.deleteTeam(_id as string);
    if (!deletedTeam) throw new AppError(MESSAGES.TEAM_NOT_FOUND, StatusCode.NOT_FOUND);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.TEAM_DELETED_SUCCESSFULLY, data: deletedTeam });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

export default {
  addTeam,
  getAllTeam,
  getTeamById,
  updateTeam,
  addTeamMember,
  removeTeamMember,
  deleteTeam,
};
