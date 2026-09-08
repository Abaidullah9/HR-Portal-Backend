import { Router } from "express";
import { isAuthenticated } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/authorize.middleware";
import organizationSettingController from "../controllers/organizationSetting.controller";

const router = Router();

router.get("/", isAuthenticated, authorize("read_OrganizationSetting"), organizationSettingController.getOrganizationSettings);
router.post("/", isAuthenticated, authorize("create_OrganizationSetting"), organizationSettingController.addOrUpdateOrganization);
router.patch("/", isAuthenticated, authorize("update_OrganizationSetting"), organizationSettingController.updateOrganizationSettings);
router.delete("/", isAuthenticated, authorize("delete_OrganizationSetting"), organizationSettingController.deleteOrganizationSettings);

export default router;
