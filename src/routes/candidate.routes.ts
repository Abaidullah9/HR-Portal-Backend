import { Router } from "express";
import { isAuthenticated } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/authorize.middleware";
import candidateController from "../controllers/candidate.controller";

const router = Router();

router.get("/", candidateController.getAllCandidate);
router.get("/job-posting/:jobPostingId", candidateController.getCandidateByJobPosting);
router.get("/status/:status", candidateController.getCandidateByStatus);
router.get("/:_id", candidateController.getCandidateById);
router.post("/", isAuthenticated, authorize("Candidate", "create"), candidateController.addCandidate);
router.patch("/:_id", isAuthenticated, authorize("Candidate", "update"), candidateController.updateCandidate);
router.patch("/:_id/status", isAuthenticated, authorize("Candidate", "updateStatus"), candidateController.updateCandidateStatus);
router.delete("/:_id", isAuthenticated, authorize("Candidate", "delete"), candidateController.deleteCandidate);

export default router;
