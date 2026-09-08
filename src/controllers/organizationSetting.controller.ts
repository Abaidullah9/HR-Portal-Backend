import { Request, Response } from "express";
import { sendErrorResponse } from "../utils/helper/sendError";
import organizationSettingServices from "../services/organizationSetting.services";
import { MESSAGES } from "../utils/helper/constants/messages";
import { StatusCode } from "../utils/helper/constants/enum";
import { AppError } from "../utils/helper/AppError";
import { CreateOrganizationSettingDTO, UpdateOrganizationSettingDTO } from "../utils/dtos/organizationSetting.dto";

const getOrganizationSettings = async (req: Request, res: Response) => {
  try {
    const result = await organizationSettingServices.getOrganizationSettings();
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.ORGANIZATION_SETTINGS_FETCHED_SUCCESSFULLY, data: result });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const addOrUpdateOrganization = async (req: Request, res: Response) => {
  try {
    const body: CreateOrganizationSettingDTO = req.body;
    const settings = await organizationSettingServices.createOrUpdateOrganization(body);
    if (!settings) throw new AppError(MESSAGES.FAILED_TO_CREATE_ORGANIZATION_SETTINGS, StatusCode.INTERNAL_SERVER_ERROR);
    res.status(StatusCode.CREATED).json({ success: true, message: MESSAGES.ORGANIZATION_SETTINGS_UPDATED_SUCCESSFULLY, data: settings });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const updateOrganizationSettings = async (req: Request, res: Response) => {
  try {
    const updateData: UpdateOrganizationSettingDTO = req.body;
    const result = await organizationSettingServices.updateOrganizationSettings(updateData);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.ORGANIZATION_SETTINGS_UPDATED_SUCCESSFULLY, data: result });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const deleteOrganizationSettings = async (req: Request, res: Response) => {
  try {
    const result = await organizationSettingServices.deleteOrganizationSettings();
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.ORGANIZATION_SETTINGS_DELETED_SUCCESSFULLY, data: result });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

export default {
  getOrganizationSettings,
  addOrUpdateOrganization,
  updateOrganizationSettings,
  deleteOrganizationSettings,
};
