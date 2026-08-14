import { Router } from "express";
import auth from "../../middlewares/authMiddleware";
import validateRequest from "../../middlewares/validateRequest";
import { UploadController } from "./upload.controller";
import {
  deleteFileValidation,
  getPresignedUrlValidation,
} from "./upload.validation";

const router = Router();

// ⚡ Generate Single or Batch Presigned Upload URLs for Direct S3 Uploads (15ms)
router.post(
  "/presigned-url",
  auth(),
  validateRequest(getPresignedUrlValidation),
  UploadController.getPresignedUploadUrls,
);

// Delete file from S3
router.delete(
  "/",
  auth(),
  validateRequest(deleteFileValidation),
  UploadController.deleteFile,
);

export const UploadRoutes = router;
