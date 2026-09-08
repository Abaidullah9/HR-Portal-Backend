import { StatusCode } from "../utils/helper/constants/enum";
import { AppError } from "../utils/helper/AppError";
import organizationSettingModel from "../models/organizationSetting.model";
import { CreateOrganizationSettingDTO } from "../utils/dtos/organizationSetting.dto";
import { MESSAGES } from "../utils/helper/constants/messages";

const getOrganizationSettings = async () => {
  const settings = await organizationSettingModel.findOne();
  if (!settings) throw new AppError(MESSAGES.ORGANIZATION_SETTINGS_NOT_FOUND, StatusCode.NOT_FOUND);
  return settings;
};

const createOrUpdateOrganization = async (settingsData: CreateOrganizationSettingDTO) => {
  if (!settingsData) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const settings = await organizationSettingModel.findOneAndUpdate(
    {},
    settingsData,
    { upsert: true, returnDocument: 'after' }
  );
  return settings;
};

const updateOrganizationSettings = async (updateData: Partial<CreateOrganizationSettingDTO>) => {
  if (!updateData) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const settings = await organizationSettingModel.findOneAndUpdate(
    {},
    updateData,
    { returnDocument: 'after' }
  );
  if (!settings) throw new AppError(MESSAGES.ORGANIZATION_SETTINGS_NOT_FOUND, StatusCode.NOT_FOUND);
  return settings;
};

const deleteOrganizationSettings = async () => {
  const settings = await organizationSettingModel.findOneAndDelete({});
  if (!settings) throw new AppError(MESSAGES.ORGANIZATION_SETTINGS_NOT_FOUND, StatusCode.NOT_FOUND);
  return settings;
};

export default {
  getOrganizationSettings,
  createOrUpdateOrganization,
  updateOrganizationSettings,
  deleteOrganizationSettings,
};
