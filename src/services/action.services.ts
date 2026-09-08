import { StatusCode } from "../utils/helper/constants/enum";
import { AppError } from "../utils/helper/AppError";
import actionModel from "../models/action.model";
import { CreateActionDTO } from "../utils/dtos/action.dto";
import { MESSAGES } from "../utils/helper/constants/messages";
import { getPagination, paginatedResult, PaginationQuery } from "../utils/common";
const addAction = async (actionData: CreateActionDTO) => {
  const newAction = await actionModel.create(actionData);
  return newAction;
};

const getAllAction = async (query: PaginationQuery) => {
  const { page, limit, skip } = getPagination(query);
  const allActions = await actionModel.find().skip(skip).limit(limit);
  const total = await actionModel.countDocuments();
  return paginatedResult(allActions, total, page, limit);
};

const getActionById = async (_id: string) => {
  if (!_id) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const actionById = await actionModel.findById(_id);
  if (!actionById) throw new AppError(MESSAGES.ACTION_NOT_FOUND, StatusCode.NOT_FOUND);
  return actionById;
};



const updateAction = async (_id: string, updateData: Partial<CreateActionDTO>) => {
  if (!_id) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const updatedAction = await actionModel.findByIdAndUpdate(_id, updateData, { returnDocument: 'after' });
  if (!updatedAction) throw new AppError(MESSAGES.ACTION_NOT_FOUND, StatusCode.NOT_FOUND);

  return updatedAction;
};

const deleteAction = async (_id: string) => {
  if (!_id) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const deletedAction = await actionModel.findByIdAndDelete(_id);

  return deletedAction;
};

export default {
  addAction,
  getAllAction,
  getActionById,
  updateAction,
  deleteAction,
};
