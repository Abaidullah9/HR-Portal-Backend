import { Router } from "express";
import { isAuthenticated } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/authorize.middleware";
import feedbackController from "../controllers/feedback.controller";

const router = Router();

router.get("/target/:targetEmployeeId", feedbackController.getFeedbackByTargetEmployee);
router.get("/reviewer/:reviewerId", feedbackController.getFeedbackByReviewer);
router.get("/cycle/:cycleId", feedbackController.getFeedbackByCycle);
router.get("/:_id", feedbackController.getFeedbackById);
router.post("/", isAuthenticated, authorize("Feedback", "create"), feedbackController.addFeedback);
router.patch("/:_id", isAuthenticated, authorize("Feedback", "update"), feedbackController.updateFeedback);
router.delete("/:_id", isAuthenticated, authorize("Feedback", "delete"), feedbackController.deleteFeedback);

export default router;
