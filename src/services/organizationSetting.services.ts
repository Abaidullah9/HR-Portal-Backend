import { StatusCode } from "../utils/helper/constants/enum";
import { AppError } from "../utils/helper/AppError";
import organizationSettingModel from "../models/organizationSetting.model";
import { CreateOrganizationSettingDTO } from "../utils/dtos/organizationSetting.dto";
import { MESSAGES } from "../utils/helper/constants/messages";
import { tenantFields, tenantFilter } from "../utils/context";

const getOrganizationSettings = async () => {
  const settings = await organizationSettingModel.findOne(tenantFilter());
  if (!settings) throw new AppError(MESSAGES.ORGANIZATION_SETTINGS_NOT_FOUND, StatusCode.NOT_FOUND);
  return settings;
};

const createOrUpdateOrganization = async (settingsData: CreateOrganizationSettingDTO) => {
  if (!settingsData) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const settings = await organizationSettingModel.findOneAndUpdate(
    tenantFilter(),
    { ...settingsData, ...tenantFields() },
    { upsert: true, returnDocument: 'after' }
  );
  return settings;
};

const updateOrganizationSettings = async (updateData: Partial<CreateOrganizationSettingDTO>) => {
  if (!updateData) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const settings = await organizationSettingModel.findOneAndUpdate(
    tenantFilter(),
    updateData,
    { returnDocument: 'after' }
  );
  if (!settings) throw new AppError(MESSAGES.ORGANIZATION_SETTINGS_NOT_FOUND, StatusCode.NOT_FOUND);
  return settings;
};

const deleteOrganizationSettings = async () => {
  const settings = await organizationSettingModel.findOneAndDelete(tenantFilter());
  if (!settings) throw new AppError(MESSAGES.ORGANIZATION_SETTINGS_NOT_FOUND, StatusCode.NOT_FOUND);
  return settings;
};

/**
 * The ISO currency payroll is denominated in.
 *
 * A payslip that does not say which currency it is in is ambiguous, and a run
 * that adds rupees to dollars is simply wrong. The organisation owns the single
 * currency; PKR is the pilot default.
 */
export const organizationCurrency = async (): Promise<string> => {
  const settings = await organizationSettingModel.findOne(tenantFilter()).select('currency');
  return (settings?.currency || 'PKR').toUpperCase();
};

export default {
  getOrganizationSettings,
  createOrUpdateOrganization,
  updateOrganizationSettings,
  deleteOrganizationSettings,
};
