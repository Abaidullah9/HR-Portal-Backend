import { Router } from "express";
import { isAuthenticated } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/authorize.middleware";
import interviewController from "../controllers/interview.controller";

const router = Router();

router.get("/paginated", isAuthenticated, authorize("read_Interview"), interviewController.getAllInterview);
router.get("/candidate/:candidateId", isAuthenticated, authorize("read_Interview"), interviewController.getInterviewByCandidate);
router.get("/interviewer/:interviewerId", isAuthenticated, authorize("read_Interview"), interviewController.getInterviewByInterviewer);
router.get("/status/:status", isAuthenticated, authorize("read_Interview"), interviewController.getInterviewByStatus);
router.get("/:_id", isAuthenticated, authorize("read_Interview"), interviewController.getInterviewById);
router.post("/", isAuthenticated, authorize("create_Interview"), interviewController.addInterview);
router.patch("/:_id/status", isAuthenticated, authorize("update_InterviewStatus"), interviewController.updateInterviewStatus);
router.patch("/:_id", isAuthenticated, authorize("update_Interview"), interviewController.updateInterview);
router.delete("/:_id", isAuthenticated, authorize("delete_Interview"), interviewController.deleteInterview);

export default router;
