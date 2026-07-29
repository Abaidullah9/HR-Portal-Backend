import Action from "../models/action.model";
import { AppError } from "../utils/helper/AppError";
import { CreateActionDTO, UpdateActionDTO } from "../utils/dtos/action.dto";
import { getPagination, paginatedResult, PaginationQuery } from "../utils/pagination";

const addAction = async (actionData: CreateActionDTO) => {
  if (!actionData.actionName || !actionData.actionDescription || !actionData.module) {
    throw new AppError("Missing required fields: actionName, actionDescription, module", 400);
  }

  const existingAction = await Action.findOne({ actionName: actionData.actionName });
  if (existingAction) {
    throw new AppError("Action with this name already exists", 409);
  }

  const action = await Action.create(actionData);
  return action;
};

const getAllAction = async (query?: PaginationQuery) => {
  if (!query || (!query.page && !query.limit)) {
    const actions = await Action.find();
    return actions;
  }
  const { page, limit, skip } = getPagination(query);
  const [actions, total] = await Promise.all([
    Action.find().skip(skip).limit(limit),
    Action.countDocuments(),
  ]);
  return paginatedResult(actions, total, page, limit);
};

const getActionById = async (actionId: string) => {
  const action = await Action.findById(actionId);
  if (!action) {
    throw new AppError("Action not found", 404);
  }
  return action;
};

const getActionsByModule = async (module: string) => {
  const actions = await Action.find({ module });
  return actions;
};

const updateAction = async (actionId: string, updateData: UpdateActionDTO) => {
  if (updateData.actionName) {
    const existingAction = await Action.findOne({ actionName: updateData.actionName });
    if (existingAction && existingAction._id.toString() !== actionId) {
      throw new AppError("Action with this name already exists", 409);
    }
  }

  const action = await Action.findByIdAndUpdate(actionId, updateData, { new: true, runValidators: true });
  if (!action) {
    throw new AppError("Action not found", 404);
  }
  return action;
};

const deleteAction = async (actionId: string) => {
  const action = await Action.findByIdAndDelete(actionId);
  if (!action) {
    throw new AppError("Action not found", 404);
  }
  return action;
};

export default {
  addAction,
  getAllAction,
  getActionById,
  getActionsByModule,
  updateAction,
  deleteAction,
};
