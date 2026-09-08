import { StatusCode } from "../utils/helper/constants/enum";
import { AppError } from "../utils/helper/AppError";
import teamModel from "../models/team.model";
import { CreateTeamDTO } from "../utils/dtos/team.dto";
import { MESSAGES } from "../utils/helper/constants/messages";
import { getPagination, paginatedResult, PaginationQuery } from "../utils/common";
import mongoose from "mongoose";

const addTeam = async (teamData: CreateTeamDTO) => {
  if (!teamData) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const newTeam = await teamModel.create(teamData);
  return newTeam;
};

const getAllTeam = async (query: PaginationQuery) => {
  const { page, limit, skip } = getPagination(query);
  const allTeams = await teamModel.find()
    .populate("teamLeadId", "name email")
    .populate("teamMembers.employeeId", "name email")
    .skip(skip)
    .limit(limit);
  const total = await teamModel.countDocuments();
  if (!allTeams) throw new AppError(MESSAGES.TEAM_NOT_FOUND, StatusCode.NOT_FOUND);
  return paginatedResult(allTeams, total, page, limit);
};

const getTeamById = async (_id: string) => {
  if (!_id) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const teamById = await teamModel.findById(_id)
    .populate("teamLeadId", "name email")
    .populate("teamMembers.employeeId", "name email");
  if (!teamById) throw new AppError(MESSAGES.TEAM_NOT_FOUND, StatusCode.NOT_FOUND);
  return teamById;
};

const updateTeam = async (_id: string, updateData: Partial<CreateTeamDTO>) => {
  if (!_id) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const updatedTeam = await teamModel.findByIdAndUpdate(_id, updateData, { returnDocument: 'after' })
    .populate("teamLeadId", "name email")
    .populate("teamMembers.employeeId", "name email");
  if (!updatedTeam) throw new AppError(MESSAGES.TEAM_NOT_FOUND, StatusCode.NOT_FOUND);

  return updatedTeam;
};

const addTeamMember = async (_id: string, employeeId: string) => {
  if (!_id || !employeeId) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const team = await teamModel.findById(_id);
  if (!team) throw new AppError(MESSAGES.TEAM_NOT_FOUND, StatusCode.NOT_FOUND);

  const isMember = team.teamMembers.some(
    (member: { employeeId: mongoose.Types.ObjectId }) => member.employeeId.toString() === employeeId
  );
  if (isMember) throw new AppError(MESSAGES.ALREADY_A_MEMBER, StatusCode.CONFLICT);

  team.teamMembers.push({ employeeId: new mongoose.Types.ObjectId(employeeId) });
  await team.save();

  return team.populate(["teamLeadId", "teamMembers.employeeId"]);
};

const removeTeamMember = async (_id: string, employeeId: string) => {
  if (!_id || !employeeId) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const team = await teamModel.findById(_id);
  if (!team) throw new AppError(MESSAGES.TEAM_NOT_FOUND, StatusCode.NOT_FOUND);

  const memberIndex = team.teamMembers.findIndex(
    (member: { employeeId: mongoose.Types.ObjectId }) => member.employeeId.toString() === employeeId
  );
  if (memberIndex === -1) throw new AppError(MESSAGES.NOT_A_MEMBER, StatusCode.NOT_FOUND);

  team.teamMembers.splice(memberIndex, 1);
  await team.save();

  return team.populate(["teamLeadId", "teamMembers.employeeId"]);
};

const deleteTeam = async (_id: string) => {
  if (!_id) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const deletedTeam = await teamModel.findByIdAndDelete(_id);

  return deletedTeam;
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
