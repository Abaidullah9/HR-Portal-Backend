import { Request, Response } from "express";
import { sendErrorResponse } from "../utils/helper/sendError";
import { CreateActionDTO, UpdateActionDTO } from "../utils/dtos/action.dto";
import actionServices from "../services/action.services";
import { MESSAGES } from "../utils/helper/constants/messages";
import { StatusCode } from "../utils/helper/constants/enum";
import { AppError } from "../utils/helper/AppError";
import { PaginationQuery } from "../utils/common";

const addAction = async (req: Request, res: Response) => {
  try {
    const body: CreateActionDTO = req.body;
    const newAction = await actionServices.addAction(body);
    if (!newAction)
      throw new AppError(
        MESSAGES.FAILED_TO_CREATE_ACTION,
        StatusCode.INTERNAL_SERVER_ERROR,
      );
    res
      .status(StatusCode.CREATED)
      .json({
        success: true,
        message: MESSAGES.ACTION_ADDED_SUCCESSFULLY,
        data: newAction,
      });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const getAllAction = async (req: Request, res: Response) => {
  try {
    const { data, pagination } = await actionServices.getAllAction(
      req.query as PaginationQuery,
    );
    res
      .status(StatusCode.OK)
      .json({
        success: true,
        message: MESSAGES.ALL_ACTIONS_FETCHED_SUCCESSFULLY,
        data,
        pagination,
      });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const getActionById = async (req: Request, res: Response) => {
  try {
    const { _id } = req.params;
    const result = await actionServices.getActionById(_id as string);
    res
      .status(StatusCode.OK)
      .json({
        success: true,
        message: MESSAGES.ACTION_FETCHED_SUCCESSFULLY,
        data: result,
      });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const updateAction = async (req: Request, res: Response) => {
  try {
    const { _id } = req.params;
    const updateData: UpdateActionDTO = req.body;
    const result = await actionServices.updateAction(_id as string, updateData);
    res
      .status(StatusCode.OK)
      .json({
        success: true,
        message: MESSAGES.ACTION_UPDATED_SUCCESSFULLY,
        data: result,
      });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const deleteAction = async (req: Request, res: Response) => {
  try {
    const { _id } = req.params;
    const deletedAction = await actionServices.deleteAction(_id as string);
    if (!deletedAction) throw new AppError(MESSAGES.ACTION_NOT_FOUND, StatusCode.NOT_FOUND);
    res
      .status(StatusCode.OK)
      .json({
        success: true,
        message: MESSAGES.ACTION_DELETED_SUCCESSFULLY,
        data: deletedAction,
      });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

export default {
  addAction,
  getAllAction,
  getActionById,
  updateAction,
  deleteAction,
};
