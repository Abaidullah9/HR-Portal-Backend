import multer from "multer";
import path from "path";

/**
 * Uploads are buffered in memory (capped at 5MB) so the storage driver decides
 * where they land. Writing straight to disk with `diskStorage` bound the app to
 * a single host: on a platform with ephemeral or shared storage the file and its
 * database record ended up on different machines.
 */
const fileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error("Only images (jpeg, jpg, png) and documents (pdf, doc, docx) are allowed"));
  }
};

export const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});
