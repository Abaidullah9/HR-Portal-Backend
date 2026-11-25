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
import { resolveReadScope } from "../utils/helper/ownership";

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
    const scope = await resolveReadScope(req.userId!);
    const { data, pagination } = await appraisalServices.getAllAppraisal(
      req.query as PaginationQuery,
      scope,
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
    const scope = await resolveReadScope(req.userId!);
    const result = await appraisalServices.getAppraisalById(_id as string, scope);
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

/**
 * The caller's own reviews. Employees hold no read_Appraisal, so this is
 * authorised on an action every role holds and scoped to the caller's own
 * employee record rather than an id from the request.
 */
const getAppraisalByEmployee = async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const scope = await resolveReadScope(req.userId!);
    const result = await appraisalServices.getAppraisalsByEmployee(
      employeeId as string,
      scope,
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

const submitSelfReview = async (req: Request, res: Response) => {
  try {
    const scope = await resolveReadScope(req.userId!);
    const result = await appraisalServices.submitSelfReview(
      req.params._id as string,
      req.body as { comment: string; rating?: number },
      scope,
    );
    res.status(StatusCode.OK).json({ success: true, message: 'Self review submitted', data: result });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const submitManagerReview = async (req: Request, res: Response) => {
  try {
    const scope = await resolveReadScope(req.userId!);
    const result = await appraisalServices.submitManagerReview(
      req.params._id as string,
      req.body as { comment: string; rating?: number },
      scope,
    );
    res.status(StatusCode.OK).json({ success: true, message: 'Manager review submitted', data: result });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const calibrate = async (req: Request, res: Response) => {
  try {
    const scope = await resolveReadScope(req.userId!);
    const result = await appraisalServices.calibrate(
      req.params._id as string,
      req.body as { note: string; rating?: number },
      scope,
      req.userId,
    );
    res.status(StatusCode.OK).json({ success: true, message: 'Appraisal calibrated', data: result });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const lock = async (req: Request, res: Response) => {
  try {
    const scope = await resolveReadScope(req.userId!);
    const result = await appraisalServices.lock(req.params._id as string, scope);
    res.status(StatusCode.OK).json({ success: true, message: 'Appraisal locked', data: result });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

export default {
  submitSelfReview,
  submitManagerReview,
  calibrate,
  lock,
  addAppraisal,
  getAllAppraisal,
  getAppraisalById,
  getAppraisalByEmployee,
  getAppraisalByCycle,
  updateAppraisal,
  updateAppraisalStatus,
  deleteAppraisal,
};
