import OrganizationSetting from "../models/organizationSetting.model";
import { AppError } from "../utils/helper/AppError";
import { CreateOrganizationSettingDTO, UpdateOrganizationSettingDTO } from "../utils/dtos/organizationSetting.dto";

const createOrUpdateOrganization = async (orgData: CreateOrganizationSettingDTO) => {
  if (!orgData.organizationName || !orgData.email) {
    throw new AppError("Missing required fields: organizationName, email", 400);
  }

  // Check if organization settings already exist (singleton pattern)
  const existingOrg = await OrganizationSetting.findOne();
  if (existingOrg) {
    // Update existing
    const updated = await OrganizationSetting.findByIdAndUpdate(existingOrg._id, orgData, { new: true, runValidators: true });
    return updated;
  }

  // Create new
  const organization = await OrganizationSetting.create(orgData);
  return organization;
};

const getOrganizationSettings = async () => {
  const org = await OrganizationSetting.findOne();
  if (!org) {
    throw new AppError("Organization settings not found", 404);
  }
  return org;
};

const updateOrganizationSettings = async (updateData: UpdateOrganizationSettingDTO) => {
  const org = await OrganizationSetting.findOne();
  if (!org) {
    throw new AppError("Organization settings not found. Please create settings first.", 404);
  }

  const updated = await OrganizationSetting.findByIdAndUpdate(org._id, updateData, { new: true, runValidators: true });
  return updated;
};

const deleteOrganizationSettings = async () => {
  const org = await OrganizationSetting.findOneAndDelete();
  if (!org) {
    throw new AppError("Organization settings not found", 404);
  }
  return org;
};

export default {
  createOrUpdateOrganization,
  getOrganizationSettings,
  updateOrganizationSettings,
  deleteOrganizationSettings,
};
