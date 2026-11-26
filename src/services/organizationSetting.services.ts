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

/**
 * Everything payroll needs to price a run: currency, working week and the
 * statutory switches. Defaults match the Pakistani pilot, so an organisation
 * created before these fields existed still gets tax and EOBI rather than an
 * under-withheld payslip.
 */
export const organizationStatutorySettings = async () => {
  const settings = await organizationSettingModel
    .findOne(tenantFilter())
    .select(
      'currency workingDays taxEnabled eobiEnabled minimumWage providentFundEmployeePercent providentFundEmployerPercent',
    );

  return {
    currency: (settings?.currency || 'PKR').toUpperCase(),
    workingDays: settings?.workingDays?.length ? settings.workingDays : [1, 2, 3, 4, 5],
    taxEnabled: settings?.taxEnabled ?? true,
    eobiEnabled: settings?.eobiEnabled ?? true,
    minimumWage: settings?.minimumWage ?? 37000,
    providentFundEmployeePercent: settings?.providentFundEmployeePercent ?? 0,
    providentFundEmployerPercent: settings?.providentFundEmployerPercent ?? 0,
  };
};

export default {
  getOrganizationSettings,
  createOrUpdateOrganization,
  updateOrganizationSettings,
  deleteOrganizationSettings,
  organizationCurrency,
  organizationStatutorySettings,
};
