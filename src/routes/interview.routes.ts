import { Router } from "express";
import { isAuthenticated } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/authorize.middleware";
import interviewController from "../controllers/interview.controller";

const router = Router();

router.get("/candidate/:candidateId", interviewController.getInterviewByCandidate);
router.get("/interviewer/:interviewerId", interviewController.getInterviewByInterviewer);
router.get("/status/:status", interviewController.getInterviewByStatus);
router.get("/:_id", interviewController.getInterviewById);
router.post("/", isAuthenticated, authorize("Interview", "create"), interviewController.addInterview);
router.patch("/:_id", isAuthenticated, authorize("Interview", "update"), interviewController.updateInterview);
router.patch("/:_id/status", isAuthenticated, authorize("Interview", "updateStatus"), interviewController.updateInterviewStatus);
router.delete("/:_id", isAuthenticated, authorize("Interview", "delete"), interviewController.deleteInterview);

export default router;
