import { Router } from "express";
import { isAuthenticated } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/authorize.middleware";
import feedbackController from "../controllers/feedback.controller";

const router = Router();

router.get("/paginated", isAuthenticated, authorize("read_Feedback"), feedbackController.getAllFeedback);
router.get("/target/:targetEmployeeId", isAuthenticated, authorize("read_Feedback"), feedbackController.getFeedbackByTargetEmployee);
router.get("/reviewer/:reviewerId", isAuthenticated, authorize("read_Feedback"), feedbackController.getFeedbackByReviewer);
router.get("/cycle/:cycleId", isAuthenticated, authorize("read_Feedback"), feedbackController.getFeedbackByCycle);
router.get("/:_id", isAuthenticated, authorize("read_Feedback"), feedbackController.getFeedbackById);
router.post("/", isAuthenticated, authorize("create_Feedback"), feedbackController.addFeedback);
router.patch("/:_id", isAuthenticated, authorize("update_Feedback"), feedbackController.updateFeedback);
router.delete("/:_id", isAuthenticated, authorize("delete_Feedback"), feedbackController.deleteFeedback);

export default router;
