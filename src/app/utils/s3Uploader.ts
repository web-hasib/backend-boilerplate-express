import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import http from "http";
import https from "https";
import { v4 as uuidv4 } from "uuid";
import config from "../config";
import AppError from "../errors/AppError";
import logger from "./logger";

// ⚡ High-Performance S3 Client with Persistent TCP Connection Pooling & Fast Timeouts
const s3Client = new S3Client({
  region: config.aws.region,
  credentials: {
    accessKeyId: config.aws.access_key_id,
    secretAccessKey: config.aws.secret_access_key,
  },
  requestHandler: new NodeHttpHandler({
    httpAgent: new http.Agent({ keepAlive: true, maxSockets: 50 }),
    httpsAgent: new https.Agent({ keepAlive: true, maxSockets: 50 }),
    connectionTimeout: 3000, // 3s max connect wait
    requestTimeout: 10000, // 10s max request wait
  }),
});

export interface IPresignedUrlRequest {
  filename: string;
  contentType: string;
}

export interface IPresignedUrlResponse {
  filename: string;
  uploadUrl: string;
  fileUrl: string;
  key: string;
  expiresIn: number;
}

/**
 * Generate a unique S3 key preserving clean extension
 */
const generateS3Key = (
  originalName: string,
  folder: string = "uploads",
): { key: string; filename: string } => {
  const timestamp = Date.now();
  const uuid = uuidv4().split("-")[0]; // Short UUID

  const extensionMatch = originalName.match(/\.([a-zA-Z0-9]+)$/);
  const ext = extensionMatch ? extensionMatch[1].toLowerCase() : "bin";

  const sanitizedName = originalName
    .replace(/\.[^/.]+$/, "") // Remove extension
    .replace(/[^a-zA-Z0-9_-]/g, "-") // Replace special chars with hyphen
    .toLowerCase()
    .substring(0, 30); // Limit length

  const filename = `${sanitizedName}-${timestamp}-${uuid}.${ext}`;
  const key = folder ? `${folder}/${filename}` : filename;

  return { key, filename };
};

/**
 * ⚡ Generate a Single Presigned Upload URL for Direct-to-S3 Client Upload (Sub-15ms)
 * Bypasses backend server memory/CPU completely.
 */
export const getPresignedUploadUrl = async (options: {
  filename: string;
  contentType: string;
  folder?: string;
  expiresIn?: number;
}): Promise<IPresignedUrlResponse> => {
  if (!config.aws.s3_bucket_name) {
    throw new AppError(500, "AWS S3 bucket is not configured");
  }

  const {
    filename,
    contentType,
    folder = "uploads",
    expiresIn = 900,
  } = options;

  try {
    const { key } = generateS3Key(filename, folder);

    const command = new PutObjectCommand({
      Bucket: config.aws.s3_bucket_name,
      Key: key,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn });
    const fileUrl = `https://${config.aws.s3_bucket_name}.s3.${config.aws.region}.amazonaws.com/${key}`;

    return {
      filename,
      uploadUrl,
      fileUrl,
      key,
      expiresIn,
    };
  } catch (error: unknown) {
    const err = error as Error;
    throw new AppError(
      500,
      `Failed to generate presigned upload URL: ${err.message}`,
    );
  }
};

/**
 * ⚡ Generate Multiple Presigned Upload URLs in Parallel (Batch Uploads)
 * Allows client to upload 10, 20, or 50 files directly to S3 simultaneously.
 */
export const getMultiplePresignedUploadUrls = async (options: {
  files: IPresignedUrlRequest[];
  folder?: string;
  expiresIn?: number;
}): Promise<IPresignedUrlResponse[]> => {
  if (!filesPresent(options.files)) {
    throw new AppError(
      400,
      "At least one file is required for presigned upload URLs",
    );
  }

  const { files, folder = "uploads", expiresIn = 900 } = options;

  const promises = files.map((file) =>
    getPresignedUploadUrl({
      filename: file.filename,
      contentType: file.contentType,
      folder,
      expiresIn,
    }),
  );

  return Promise.all(promises);
};

const filesPresent = (
  files?: IPresignedUrlRequest[],
): files is IPresignedUrlRequest[] => {
  return Array.isArray(files) && files.length > 0;
};

/**
 * Extract S3 key from full public URL (automatically decodes URL-encoded characters)
 */
export const extractS3KeyFromUrl = (url: string): string | null => {
  if (!url) return null;

  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname.substring(1);

    let key = pathname;
    if (
      urlObj.hostname.startsWith("s3.") ||
      urlObj.hostname.startsWith("s3-")
    ) {
      const parts = pathname.split("/");
      key = parts.slice(1).join("/");
    }

    return decodeURIComponent(key);
  } catch {
    return null;
  }
};

/**
 * Delete single image/file from S3
 */
export const deleteImageFromS3 = async (key: string): Promise<void> => {
  if (!config.aws.s3_bucket_name || !key) return;

  try {
    const command = new DeleteObjectCommand({
      Bucket: config.aws.s3_bucket_name,
      Key: key,
    });

    await s3Client.send(command);
  } catch (error: unknown) {
    logger.error("S3 delete error:", { error, key });
  }
};

/**
 * ⚡ Delete multiple images/files from S3 in a single batch operation (DeleteObjectsCommand)
 * Much faster than individual requests and respects the 1000-object S3 batch limit.
 */
export const deleteMultipleImagesFromS3 = async (
  keys: string[],
): Promise<void> => {
  const validKeys = keys.filter(Boolean);
  if (!config.aws.s3_bucket_name || validKeys.length === 0) return;

  // S3 DeleteObjects supports up to 1000 objects per request
  const CHUNK_SIZE = 1000;
  for (let i = 0; i < validKeys.length; i += CHUNK_SIZE) {
    const chunk = validKeys.slice(i, i + CHUNK_SIZE);
    try {
      const command = new DeleteObjectsCommand({
        Bucket: config.aws.s3_bucket_name,
        Delete: {
          Objects: chunk.map((Key) => ({ Key })),
          Quiet: true,
        },
      });

      await s3Client.send(command);
    } catch (error: unknown) {
      logger.error("S3 batch delete error:", {
        error,
        keysCount: chunk.length,
      });
    }
  }
};
