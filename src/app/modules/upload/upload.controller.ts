import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import { UploadService } from "./upload.service";
import sendResponse from "../../utils/sendResponse";
import type { DeleteFileBody, PresignedUrlBody } from "./upload.validation";

/**
 * ⚡ Generate Single or Batch Presigned Upload URLs (Direct-to-S3)
 */
const getPresignedUploadUrls = catchAsync(
  async (req: Request, res: Response) => {
    const result = await UploadService.getPresignedUploadUrls(
      req.body as PresignedUrlBody,
    );

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Presigned upload URL(s) generated successfully",
      data: result,
    });
  },
);

/**
 * Delete a file from S3
 */
const deleteFile = catchAsync(async (req: Request, res: Response) => {
  const result = await UploadService.deleteFile(req.body as DeleteFileBody);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: result.message,
    data: { key: result.key },
  });
});

export const UploadController = {
  getPresignedUploadUrls,
  deleteFile,
};
