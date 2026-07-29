import { Router } from "express";
import { isAuthenticated } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/authorize.middleware";
import organizationSettingController from "../controllers/organizationSetting.controller";

const router = Router();

router.get("/", organizationSettingController.getOrganizationSettings);
router.post("/", isAuthenticated, authorize("Organization", "create"), organizationSettingController.addOrUpdateOrganization);
router.patch("/", isAuthenticated, authorize("Organization", "update"), organizationSettingController.updateOrganizationSettings);
router.delete("/", isAuthenticated, authorize("Organization", "delete"), organizationSettingController.deleteOrganizationSettings);

export default router;
