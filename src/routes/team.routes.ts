import { Router } from "express";
import { isAuthenticated } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/authorize.middleware";
import teamController from "../controllers/team.controller";

const router = Router();

router.get("/paginated", isAuthenticated, authorize("read_Team"), teamController.getAllTeam);
router.get("/:_id", isAuthenticated, authorize("read_Team"), teamController.getTeamById);
router.post("/", isAuthenticated, authorize("create_Team"), teamController.addTeam);
router.patch("/:_id", isAuthenticated, authorize("update_Team"), teamController.updateTeam);
router.post("/:_id/members", isAuthenticated, authorize("addMember_Team"), teamController.addTeamMember);
router.delete("/:_id/members/:employeeId", isAuthenticated, authorize("removeMember_Team"), teamController.removeTeamMember);
router.delete("/:_id", isAuthenticated, authorize("delete_Team"), teamController.deleteTeam);

export default router;
