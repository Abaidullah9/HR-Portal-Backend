import { Router } from "express";
import { isAuthenticated } from "../middlewares/auth.middleware";
import { validateCreateJobPosting } from "../utils/helper/constants/validation.utils";
import { authorize } from "../middlewares/authorize.middleware";
import jobPostingController from "../controllers/jobPosting.controller";
import { validateResource } from "../middlewares/validateResource";

const router = Router();

router.get("/paginated", isAuthenticated, authorize("read_JobPosting"), jobPostingController.getAllJobPosting);
router.get("/department/:departmentId", isAuthenticated, authorize("read_JobPosting"), jobPostingController.getJobPostingByDepartment);
router.get("/status/:status", isAuthenticated, authorize("read_JobPosting"), jobPostingController.getJobPostingByStatus);
router.get("/:_id", isAuthenticated, authorize("read_JobPosting"), jobPostingController.getJobPostingById);
router.post("/", isAuthenticated, authorize("create_JobPosting"), validateResource(validateCreateJobPosting), jobPostingController.addJobPosting);
router.patch("/:_id/status", isAuthenticated, authorize("update_JobPostingStatus"), jobPostingController.updateJobPostingStatus);
router.patch("/:_id", isAuthenticated, authorize("update_JobPosting"), jobPostingController.updateJobPosting);
router.delete("/:_id", isAuthenticated, authorize("delete_JobPosting"), jobPostingController.deleteJobPosting);

export default router;
