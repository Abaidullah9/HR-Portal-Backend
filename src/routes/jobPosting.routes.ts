import { Router } from "express";
import { isAuthenticated } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/authorize.middleware";
import jobPostingController from "../controllers/jobPosting.controller";

const router = Router();

router.get("/", jobPostingController.getAllJobPosting);
router.get("/department/:departmentId", jobPostingController.getJobPostingByDepartment);
router.get("/status/:status", jobPostingController.getJobPostingByStatus);
router.get("/:_id", jobPostingController.getJobPostingById);
router.post("/", isAuthenticated, authorize("JobPosting", "create"), jobPostingController.addJobPosting);
router.patch("/:_id", isAuthenticated, authorize("JobPosting", "update"), jobPostingController.updateJobPosting);
router.patch("/:_id/status", isAuthenticated, authorize("JobPosting", "updateStatus"), jobPostingController.updateJobPostingStatus);
router.delete("/:_id", isAuthenticated, authorize("JobPosting", "delete"), jobPostingController.deleteJobPosting);

export default router;
