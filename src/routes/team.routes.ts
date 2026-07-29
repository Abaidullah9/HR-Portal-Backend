import { Router } from "express";
import { isAuthenticated } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/authorize.middleware";
import teamController from "../controllers/team.controller";

const router = Router();

router.get("/", teamController.getAllTeam);
router.get("/:_id", teamController.getTeamById);
router.post("/", isAuthenticated, authorize("Team", "create"), teamController.addTeam);
router.patch("/:_id", isAuthenticated, authorize("Team", "update"), teamController.updateTeam);
router.post("/:_id/members", isAuthenticated, authorize("Team", "addMember"), teamController.addTeamMember);
router.delete("/:_id/members/:employeeId", isAuthenticated, authorize("Team", "removeMember"), teamController.removeTeamMember);
router.delete("/:_id", isAuthenticated, authorize("Team", "delete"), teamController.deleteTeam);

export default router;
