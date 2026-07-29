import { Request, Response } from "express";
import catchAsync from "../utils/helper/catchAsync";
import teamServices from "../services/team.services";
import { MESSAGES } from "../utils/helper/constants/messages";
import { StatusCode } from "../utils/helper/constants/enum";

const addTeam = catchAsync(async (req: Request, res: Response) => {
  const result = await teamServices.addTeam(req.body);
  res.status(StatusCode.CREATED).json({ success: true, message: MESSAGES.TEAM_ADDED_SUCCESSFULLY, data: result });
});

const getAllTeam = catchAsync(async (req: Request, res: Response) => {
  const result = await teamServices.getAllTeam(req.query as any);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.ALL_TEAMS_FETCHED_SUCCESSFULLY, data: result });
});

const getTeamById = catchAsync(async (req: Request, res: Response) => {
  const { _id } = req.params;
  const result = await teamServices.getTeamById(_id as string);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.TEAM_FETCHED_SUCCESSFULLY, data: result });
});

const updateTeam = catchAsync(async (req: Request, res: Response) => {
  const { _id } = req.params;
  const result = await teamServices.updateTeam(_id as string, req.body);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.TEAM_UPDATED_SUCCESSFULLY, data: result });
});

const addTeamMember = catchAsync(async (req: Request, res: Response) => {
  const { _id } = req.params;
  const { employeeId } = req.body;
  const result = await teamServices.addTeamMember(_id as string, employeeId);
  res.status(StatusCode.CREATED).json({ success: true, message: MESSAGES.MEMBER_ADDED_SUCCESSFULLY, data: result });
});

const removeTeamMember = catchAsync(async (req: Request, res: Response) => {
  const { _id, employeeId } = req.params;
  const result = await teamServices.removeTeamMember(_id as string, employeeId as string);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.MEMBER_REMOVED_SUCCESSFULLY, data: result });
});

const deleteTeam = catchAsync(async (req: Request, res: Response) => {
  const { _id } = req.params;
  await teamServices.deleteTeam(_id as string);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.TEAM_DELETED_SUCCESSFULLY, data: null });
});

export default {
  addTeam,
  getAllTeam,
  getTeamById,
  updateTeam,
  addTeamMember,
  removeTeamMember,
  deleteTeam,
};
