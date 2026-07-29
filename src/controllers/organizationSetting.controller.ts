import { Request, Response } from "express";
import catchAsync from "../utils/helper/catchAsync";
import organizationSettingServices from "../services/organizationSetting.services";
import { MESSAGES } from "../utils/helper/constants/messages";
import { StatusCode } from "../utils/helper/constants/enum";

const getOrganizationSettings = catchAsync(async (req: Request, res: Response) => {
  const result = await organizationSettingServices.getOrganizationSettings();
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.ORGANIZATION_SETTINGS_FETCHED_SUCCESSFULLY, data: result });
});

const addOrUpdateOrganization = catchAsync(async (req: Request, res: Response) => {
  const result = await organizationSettingServices.createOrUpdateOrganization(req.body);
  res.status(StatusCode.CREATED).json({ success: true, message: MESSAGES.ORGANIZATION_SETTINGS_UPDATED_SUCCESSFULLY, data: result });
});

const updateOrganizationSettings = catchAsync(async (req: Request, res: Response) => {
  const result = await organizationSettingServices.updateOrganizationSettings(req.body);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.ORGANIZATION_SETTINGS_UPDATED_SUCCESSFULLY, data: result });
});

const deleteOrganizationSettings = catchAsync(async (req: Request, res: Response) => {
  const result = await organizationSettingServices.deleteOrganizationSettings();
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.ORGANIZATION_SETTINGS_DELETED_SUCCESSFULLY, data: result });
});

export default {
  getOrganizationSettings,
  addOrUpdateOrganization,
  updateOrganizationSettings,
  deleteOrganizationSettings,
};
