import AppError from "../../errors/AppError";
import {
  deleteImageFromS3,
  extractS3KeyFromUrl,
  getMultiplePresignedUploadUrls,
  getPresignedUploadUrl,
} from "../../utils/s3Uploader";
import type { DeleteFileBody, PresignedUrlBody } from "./upload.validation";

/**
 * ⚡ Generate Single or Batch Presigned Upload URLs for any module (Direct-to-S3)
 */
const getPresignedUploadUrls = async (payload: PresignedUrlBody) => {
  const folder = payload.folder || "uploads";

  // 1. Multiple Files (Batch Upload)
  if (payload.files && payload.files.length > 0) {
    const urls = await getMultiplePresignedUploadUrls({
      files: payload.files,
      folder,
    });
    return {
      isBatch: true,
      count: urls.length,
      files: urls,
    };
  }

  // 2. Single File Upload
  if (payload.filename && payload.contentType) {
    const urlData = await getPresignedUploadUrl({
      filename: payload.filename,
      contentType: payload.contentType,
      folder,
    });
    return {
      isBatch: false,
      ...urlData,
    };
  }

  throw new AppError(
    400,
    "Please provide filename and contentType, or a files array for batch upload",
  );
};

/**
 * Delete a file from S3 by key or full URL
 */
const deleteFile = async (payload: DeleteFileBody) => {
  const key =
    payload.key || (payload.url ? extractS3KeyFromUrl(payload.url) : null);

  if (!key) {
    throw new AppError(400, "Could not resolve valid S3 object key from input");
  }

  await deleteImageFromS3(key);

  return {
    message: "File deleted successfully from S3",
    key,
  };
};

export const UploadService = {
  getPresignedUploadUrls,
  deleteFile,
};
