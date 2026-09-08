import { Request, Response } from "express";
import { sendErrorResponse } from "../utils/helper/sendError";
import appraisalServices from "../services/appraisal.services";
import { MESSAGES } from "../utils/helper/constants/messages";
import { StatusCode } from "../utils/helper/constants/enum";
import { AppError } from "../utils/helper/AppError";
import {
  CreateAppraisalDTO,
  UpdateAppraisalDTO,
} from "../utils/dtos/appraisal.dto";
import { PaginationQuery } from "../utils/common";

const addAppraisal = async (req: Request, res: Response) => {
  try {
    const body: CreateAppraisalDTO = req.body;
    const newAppraisal = await appraisalServices.addAppraisal(body);
    if (!newAppraisal)
      throw new AppError(
        MESSAGES.FAILED_TO_CREATE_APPRAISAL,
        StatusCode.INTERNAL_SERVER_ERROR,
      );
    res
      .status(StatusCode.CREATED)
      .json({
        success: true,
        message: MESSAGES.APPRAISAL_ADDED_SUCCESSFULLY,
        data: newAppraisal,
      });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const getAllAppraisal = async (req: Request, res: Response) => {
  try {
    const { data, pagination } = await appraisalServices.getAllAppraisal(
      req.query as PaginationQuery,
    );
    res
      .status(StatusCode.OK)
      .json({
        success: true,
        message: MESSAGES.ALL_APPRAISALS_FETCHED_SUCCESSFULLY,
        data,
        pagination,
      });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const getAppraisalById = async (req: Request, res: Response) => {
  try {
    const { _id } = req.params;
    const result = await appraisalServices.getAppraisalById(_id as string);
    res
      .status(StatusCode.OK)
      .json({
        success: true,
        message: MESSAGES.APPRAISAL_FETCHED_SUCCESSFULLY,
        data: result,
      });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const getAppraisalByEmployee = async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const result = await appraisalServices.getAppraisalsByEmployee(
      employeeId as string,
    );
    res
      .status(StatusCode.OK)
      .json({
        success: true,
        message: MESSAGES.ALL_APPRAISALS_FETCHED_SUCCESSFULLY,
        data: result,
      });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const getAppraisalByCycle = async (req: Request, res: Response) => {
  try {
    const { cycleId } = req.params;
    if (!cycleId) {
      throw new AppError(MESSAGES.CYCLE_ID_REQUIRED, StatusCode.BAD_REQUEST);
    }
    const result = await appraisalServices.getAppraisalsByCycle(
      cycleId as string,
    );
    res
      .status(StatusCode.OK)
      .json({
        success: true,
        message: MESSAGES.ALL_APPRAISALS_FETCHED_SUCCESSFULLY,
        data: result,
      });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const updateAppraisal = async (req: Request, res: Response) => {
  try {
    const { _id } = req.params;
    const updateData: UpdateAppraisalDTO = req.body;
    const result = await appraisalServices.updateAppraisal(
      _id as string,
      updateData,
    );
    res
      .status(StatusCode.OK)
      .json({
        success: true,
        message: MESSAGES.APPRAISAL_UPDATED_SUCCESSFULLY,
        data: result,
      });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const updateAppraisalStatus = async (req: Request, res: Response) => {
  try {
    const { _id } = req.params;
    const { status }: { status: string } = req.body;
    const result = await appraisalServices.updateAppraisalStatus(
      _id as string,
      status as "pending" | "completed",
    );
    res
      .status(StatusCode.OK)
      .json({
        success: true,
        message: MESSAGES.APPRAISAL_UPDATED_SUCCESSFULLY,
        data: result,
      });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const deleteAppraisal = async (req: Request, res: Response) => {
  try {
    const { _id } = req.params;
    const deletedAppraisal = await appraisalServices.deleteAppraisal(
      _id as string,
    );
    if (!deletedAppraisal)
      throw new AppError(MESSAGES.APPRAISAL_NOT_FOUND, StatusCode.NOT_FOUND);
    res
      .status(StatusCode.OK)
      .json({
        success: true,
        message: MESSAGES.APPRAISAL_DELETED_SUCCESSFULLY,
        data: deletedAppraisal,
      });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

export default {
  addAppraisal,
  getAllAppraisal,
  getAppraisalById,
  getAppraisalByEmployee,
  getAppraisalByCycle,
  updateAppraisal,
  updateAppraisalStatus,
  deleteAppraisal,
};
