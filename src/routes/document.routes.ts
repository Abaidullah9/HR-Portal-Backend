import { Router } from "express";
import { isAuthenticated } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/authorize.middleware";
import { upload } from "../middlewares/upload.middleware";
import documentController from "../controllers/document.controller";

const router = Router();

router.get("/paginated", isAuthenticated, authorize("read_Document"), documentController.getAllDocument);
router.get("/employee/:employeeId", isAuthenticated, authorize("read_Document"), documentController.getDocumentByEmployee);
router.get("/employee/:employeeId/type/:type", isAuthenticated, authorize("read_Document"), documentController.getDocumentByType);
router.get("/:_id/file", isAuthenticated, authorize("read_Document"), documentController.downloadDocument);
router.get("/:_id", isAuthenticated, authorize("read_Document"), documentController.getDocumentById);
router.post("/", isAuthenticated, authorize("create_Document"), upload.single("file"), documentController.addDocument);
router.patch("/:_id", isAuthenticated, authorize("update_Document"), documentController.updateDocument);
router.delete("/:_id", isAuthenticated, authorize("delete_Document"), documentController.deleteDocument);

export default router;
