import Team from "../models/team.model";
import { AppError } from "../utils/helper/AppError";
import { CreateTeamDTO, UpdateTeamDTO } from "../utils/dtos/team.dto";
import mongoose, { Types } from "mongoose";
import { getPagination, paginatedResult, PaginationQuery } from "../utils/pagination";

const addTeam = async (teamData: CreateTeamDTO) => {
  if (!teamData.teamName) {
    throw new AppError("Team name is required", 400);
  }

  const existingTeam = await Team.findOne({ teamName: teamData.teamName });
  if (existingTeam) {
    throw new AppError("Team with this name already exists", 409);
  }

  const team = await Team.create(teamData);
  return team;
};

const getAllTeam = async (query?: PaginationQuery) => {
  if (!query || (!query.page && !query.limit)) {
    const teams = await Team.find()
      .populate("teamLeadId", "name email")
      .populate("teamMembers.employeeId", "name email");
    return teams;
  }
  const { page, limit, skip } = getPagination(query);
  const [teams, total] = await Promise.all([
    Team.find().skip(skip).limit(limit)
      .populate("teamLeadId", "name email")
      .populate("teamMembers.employeeId", "name email"),
    Team.countDocuments(),
  ]);
  return paginatedResult(teams, total, page, limit);
};

const getTeamById = async (teamId: string) => {
  const team = await Team.findById(teamId)
    .populate("teamLeadId", "name email")
    .populate("teamMembers.employeeId", "name email");
  if (!team) {
    throw new AppError("Team not found", 404);
  }
  return team;
};

const updateTeam = async (teamId: string, updateData: UpdateTeamDTO) => {
  if (updateData.teamName) {
    const existingTeam = await Team.findOne({ teamName: updateData.teamName });
    if (existingTeam && existingTeam._id.toString() !== teamId) {
      throw new AppError("Team with this name already exists", 409);
    }
  }

  const team = await Team.findByIdAndUpdate(teamId, updateData, { new: true, runValidators: true })
    .populate("teamLeadId", "name email")
    .populate("teamMembers.employeeId", "name email");
  if (!team) {
    throw new AppError("Team not found", 404);
  }
  return team;
};

const addTeamMember = async (teamId: string, employeeId: string) => {
  const team = await Team.findById(teamId);
  if (!team) {
    throw new AppError("Team not found", 404);
  }

  const isMember = team.teamMembers.some(
    (member: { employeeId: Types.ObjectId }) => member.employeeId.toString() === employeeId
  );
  if (isMember) {
    throw new AppError("Employee is already a member of this team", 409);
  }

  team.teamMembers.push({ employeeId: new mongoose.Types.ObjectId(employeeId) });
  await team.save();

  return team.populate(["teamLeadId", "teamMembers.employeeId"]);
};

const removeTeamMember = async (teamId: string, employeeId: string) => {
  const team = await Team.findById(teamId);
  if (!team) {
    throw new AppError("Team not found", 404);
  }

  const memberIndex = team.teamMembers.findIndex(
    (member: { employeeId: Types.ObjectId }) => member.employeeId.toString() === employeeId
  );
  if (memberIndex === -1) {
    throw new AppError("Employee is not a member of this team", 404);
  }

  team.teamMembers.splice(memberIndex, 1);
  await team.save();

  return team.populate(["teamLeadId", "teamMembers.employeeId"]);
};

const deleteTeam = async (teamId: string) => {
  const team = await Team.findByIdAndDelete(teamId);
  if (!team) {
    throw new AppError("Team not found", 404);
  }
  return team;
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
