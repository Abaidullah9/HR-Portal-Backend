import { Request, Response } from "express";
import catchAsync from "../utils/helper/catchAsync";
import actionServices from "../services/action.services";
import { MESSAGES } from "../utils/helper/constants/messages";
import { StatusCode } from "../utils/helper/constants/enum";

const addAction = catchAsync(async (req: Request, res: Response) => {
  const result = await actionServices.addAction(req.body);
  res.status(StatusCode.CREATED).json({ success: true, message: MESSAGES.ACTION_ADDED_SUCCESSFULLY, data: result });
});

const getAllAction = catchAsync(async (req: Request, res: Response) => {
  const result = await actionServices.getAllAction(req.query as any);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.ALL_ACTIONS_FETCHED_SUCCESSFULLY, data: result });
});

const getActionById = catchAsync(async (req: Request, res: Response) => {
  const { _id } = req.params;
  const result = await actionServices.getActionById(_id as string);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.ACTION_FETCHED_SUCCESSFULLY, data: result });
});

const updateAction = catchAsync(async (req: Request, res: Response) => {
  const { _id } = req.params;
  const result = await actionServices.updateAction(_id as string, req.body);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.ACTION_UPDATED_SUCCESSFULLY, data: result });
});

const deleteAction = catchAsync(async (req: Request, res: Response) => {
  const { _id } = req.params;
  const result = await actionServices.deleteAction(_id as string);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.ACTION_DELETED_SUCCESSFULLY, data: result });
});

const getActionByModule = catchAsync(async (req: Request, res: Response) => {
  const { module } = req.params;
  const result = await actionServices.getActionsByModule(module as string);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.ALL_ACTIONS_FETCHED_SUCCESSFULLY, data: result });
});

export default {
  addAction,
  getAllAction,
  getActionById,
  getActionByModule,
  updateAction,
  deleteAction,
};
