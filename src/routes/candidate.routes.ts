import { Router } from "express";
import { isAuthenticated } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/authorize.middleware";
import candidateController from "../controllers/candidate.controller";

const router = Router();

router.get("/paginated", isAuthenticated, authorize("read_Candidate"), candidateController.getAllCandidate);
router.get("/job-posting/:jobPostingId", isAuthenticated, authorize("read_Candidate"), candidateController.getCandidateByJobPosting);
router.get("/status/:status", isAuthenticated, authorize("read_Candidate"), candidateController.getCandidateByStatus);
router.get("/:_id", isAuthenticated, authorize("read_Candidate"), candidateController.getCandidateById);
router.post("/", isAuthenticated, authorize("create_Candidate"), candidateController.addCandidate);
router.post("/:_id/hire", isAuthenticated, authorize("create_Employee"), candidateController.hireCandidate);
router.patch("/:_id/status", isAuthenticated, authorize("update_CandidateStatus"), candidateController.updateCandidateStatus);
router.patch("/:_id", isAuthenticated, authorize("update_Candidate"), candidateController.updateCandidate);
router.delete("/:_id", isAuthenticated, authorize("delete_Candidate"), candidateController.deleteCandidate);

export default router;
