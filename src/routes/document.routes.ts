import { Router } from "express";
import { isAuthenticated } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/authorize.middleware";
import { upload } from "../middlewares/upload.middleware";
import documentController from "../controllers/document.controller";

const router = Router();

router.get("/employee/:employeeId", documentController.getDocumentByEmployee);
router.get("/employee/:employeeId/type/:type", documentController.getDocumentByType);
router.get("/:_id", documentController.getDocumentById);
router.post("/", isAuthenticated, authorize("Document", "create"), upload.single("file"), documentController.addDocument);
router.patch("/:_id", isAuthenticated, authorize("Document", "update"), documentController.updateDocument);
router.delete("/:_id", isAuthenticated, authorize("Document", "delete"), documentController.deleteDocument);

export default router;
