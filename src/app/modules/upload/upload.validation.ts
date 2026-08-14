import { z } from "zod";

/**
 * 🎯 Categorized Supported Extensions
 */
export const IMAGE_EXTENSIONS = [
  "jpg",
  "jpeg",
  "png",
  "webp",
  "heic",
  "heif",
  "gif",
  "svg",
  "avif",
] as const;

export const VIDEO_EXTENSIONS = [
  "mp4",
  "mov",
  "webm",
  "avi",
  "mkv",
  "wmv",
  "flv",
] as const;

export const DOCUMENT_EXTENSIONS = [
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "txt",
  "csv",
  "zip",
  "rar",
] as const;

export const ALLOWED_EXTENSIONS = [
  ...IMAGE_EXTENSIONS,
  ...VIDEO_EXTENSIONS,
  ...DOCUMENT_EXTENSIONS,
] as const;

/**
 * 🎯 Categorized Supported MIME Types
 */
export const IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/heic-sequence",
  "image/heif-sequence",
  "image/gif",
  "image/svg+xml",
  "image/avif",
] as const;

export const VIDEO_MIME_TYPES = [
  "video/mp4",
  "video/quicktime", // MOV
  "video/webm",
  "video/x-msvideo", // AVI
  "video/avi",
  "video/x-matroska", // MKV
  "video/x-ms-wmv", // WMV
  "video/x-flv", // FLV
] as const;

export const DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "application/msword", // DOC
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // DOCX
  "application/vnd.ms-excel", // XLS
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // XLSX
  "application/vnd.ms-powerpoint", // PPT
  "application/vnd.openxmlformats-officedocument.presentationml.presentation", // PPTX
  "text/plain", // TXT
  "text/csv", // CSV
  "application/csv",
  "text/x-csv",
  "application/zip", // ZIP
  "application/x-zip-compressed",
  "application/x-rar-compressed", // RAR
  "application/vnd.rar",
  "application/x-rar",
] as const;

export const ALLOWED_MIME_TYPES = [
  ...IMAGE_MIME_TYPES,
  ...VIDEO_MIME_TYPES,
  ...DOCUMENT_MIME_TYPES,
] as const;

export const isAllowedExtension = (filename: string): boolean => {
  const extMatch = filename.match(/\.([a-zA-Z0-9]+)$/);
  if (!extMatch) return false;
  const ext = extMatch[1].toLowerCase();
  return (ALLOWED_EXTENSIONS as readonly string[]).includes(ext);
};

export const isAllowedMimeType = (contentType: string): boolean => {
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(
    contentType.toLowerCase().trim(),
  );
};

const filenameValidator = z
  .string({ message: "Filename is required" })
  .min(1, "Filename cannot be empty")
  .trim()
  .refine((name) => isAllowedExtension(name), {
    message: `Unsupported file extension. Allowed extensions: ${ALLOWED_EXTENSIONS.join(", ")}`,
  });

const contentTypeValidator = z
  .string({ message: "Content-Type is required" })
  .min(1, "Content-Type cannot be empty")
  .trim()
  .refine((type) => isAllowedMimeType(type), {
    message: "Unsupported Content-Type / MIME type",
  });

const fileItemSchema = z.object({
  filename: filenameValidator,
  contentType: contentTypeValidator,
});

export const getPresignedUrlValidation = {
  body: z
    .object({
      // Single file format
      filename: filenameValidator.optional(),
      contentType: contentTypeValidator.optional(),

      // Multiple files (batch) format
      files: z.array(fileItemSchema).min(1).max(50).optional(),

      // Target folder (e.g. "profiles", "products", "posts", "banners", "documents", etc.)
      folder: z
        .string()
        .regex(/^[a-zA-Z0-9/_-]+$/, "Invalid folder name")
        .trim()
        .optional()
        .default("uploads"),
    })
    .refine(
      (data) =>
        Boolean(
          (data.filename && data.contentType) ||
          (data.files && data.files.length > 0),
        ),
      {
        message:
          "Provide either 'filename' and 'contentType' for single upload, or 'files' array for multiple uploads",
      },
    ),
};

export const deleteFileValidation = {
  body: z
    .object({
      key: z.string().min(1).trim().optional(),
      url: z.string().url("Invalid file URL").trim().optional(),
    })
    .refine((data) => Boolean(data.key || data.url), {
      message: "Either 'key' or 'url' is required to delete a file",
    }),
};

export type PresignedUrlBody = z.infer<typeof getPresignedUrlValidation.body>;
export type DeleteFileBody = z.infer<typeof deleteFileValidation.body>;
